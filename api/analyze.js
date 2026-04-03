const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { articleText, userId } = req.body;
  if (!articleText) return res.status(400).json({ error: 'Article text is required' });

  try {
    // STEP 1: THE LIBRARIAN — Extract 3 main claims
    const claimExtraction = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Extract the 3 most important factual claims from this article that can be fact-checked. Return ONLY a JSON array of strings with no extra text: ["claim1", "claim2", "claim3"]'
          },
          {
            role: 'user',
            content: articleText
          }
        ],
        temperature: 0.1
      })
    });

    const claimData = await claimExtraction.json();
    let claims;
    try {
      claims = JSON.parse(claimData.choices[0].message.content);
    } catch(e) {
      // If claim extraction fails fallback to simple search
      claims = [articleText.substring(0, 200)];
    }

    // STEP 2: THE RESEARCHER — Search all claims simultaneously
    const searchPromises = claims.map(claim =>
      fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: `fact check: ${claim}`,
          search_depth: 'basic',
          max_results: 2
        })
      }).then(r => r.json())
    );

    const allSearchData = await Promise.all(searchPromises);
    const searchContext = allSearchData
      .flatMap(data => data.results || [])
      .map(r => `Source: ${r.url}\nContent: ${r.content}`)
      .join('\n\n');

    // STEP 3: THE JUDGE — Final verdict with all evidence
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are an expert fact-checker and investigative journalist. You will be given a User Article and Web Search Evidence. Compare them carefully.

VERDICT RULES:
- If Search Evidence clearly contradicts the article → verdict is "Fake"
- If Search Evidence clearly supports the article → verdict is "Real"
- If evidence is mixed or insufficient → verdict is "Uncertain"

CREDIBILITY SCORE RULES (confidenceScore must strictly match verdict):
- "Fake" → confidenceScore must be between 0 and 35
- "Uncertain" → confidenceScore must be between 36 and 64
- "Real" → confidenceScore must be between 65 and 100

REASONS RULES:
- Must be specific to THIS article — never generic
- Must reference actual claims, names, or phrases FROM the article
- Must reference search evidence where possible
- For Fake: explain what the search evidence contradicts
- For Real: explain what the search evidence confirms
- For Uncertain: explain what is verifiable vs what is disputed
- Never write vague reasons like "lacks credible sources"

RED FLAGS RULES:
- Only for Fake or Uncertain verdicts
- Must be exact suspicious phrases copied from the article
- For Real articles → redFlags must be empty array []

Return ONLY this JSON with NO extra text, NO markdown, NO backticks:
{"verdict": "Real" or "Fake" or "Uncertain", "confidenceScore": integer 0-100, "reasons": ["specific reason 1", "specific reason 2", "specific reason 3"], "redFlags": ["exact phrase 1", "exact phrase 2"]}`
          },
          {
            role: 'user',
            content: `USER ARTICLE: ${articleText}\n\nWEB SEARCH EVIDENCE:\n${searchContext || 'No web results found — analyze based on article content only.'}`
          }
        ],
        temperature: 0.1
      })
    });

    const groqData = await groqResponse.json();
    const rawText = groqData.choices[0].message.content;

    let result;
    try {
      result = JSON.parse(rawText);
    } catch(e) {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Validate verdict
    if (!['Real', 'Fake', 'Uncertain'].includes(result.verdict)) {
      result.verdict = 'Uncertain';
    }

    // Safety net: force confidenceScore into correct range
    if (result.verdict === 'Fake' && result.confidenceScore > 35) {
      result.confidenceScore = Math.floor(Math.random() * 21) + 10;
    } else if (result.verdict === 'Uncertain' && (result.confidenceScore < 36 || result.confidenceScore > 64)) {
      result.confidenceScore = Math.floor(Math.random() * 29) + 36;
    } else if (result.verdict === 'Real' && result.confidenceScore < 65) {
      result.confidenceScore = Math.floor(Math.random() * 26) + 70;
    }

    // STEP 4: Save to Supabase
    await supabase.from('analyses').insert([{
      user_id: userId || 'anon',
      article_text: articleText.substring(0, 500),
      verdict: result.verdict,
      confidence_score: result.confidenceScore,
      reasons: result.reasons,
      red_flags: result.redFlags || [],
      input_type: 'text'
    }]);

    // STEP 5: Update Global Stats
    await supabase.rpc('increment_stats', { verdict_value: result.verdict });

    res.json(result);

  } catch (error) {
    console.error('Backend Error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};