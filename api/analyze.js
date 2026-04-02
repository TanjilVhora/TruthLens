const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { articleText } = req.body;

  if (!articleText) {
    return res.status(400).json({ error: 'Article text is required' });
  }

  try {
    // Call Groq API
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
            content: `You are an expert fact-checker and investigative journalist. Analyze the given news article carefully and return ONLY a JSON object with NO extra text, NO markdown, NO backticks.

CREDIBILITY SCORE RULES (confidenceScore is a credibility scale, NOT a confidence scale):
- 0 to 35 = Article is FAKE (low credibility)
- 36 to 64 = Article is UNCERTAIN (mixed or unverifiable claims)
- 65 to 100 = Article is REAL (high credibility)

The confidenceScore MUST match the verdict:
- If verdict is "Fake" → confidenceScore must be between 0 and 35
- If verdict is "Uncertain" → confidenceScore must be between 36 and 64
- If verdict is "Real" → confidenceScore must be between 65 and 100

REASONS RULES (most important — read carefully):
- Reasons must be specific to THIS article, never generic
- Each reason must reference actual claims, names, organizations, or phrases FROM the article
- For FAKE articles: cross-reference claims against known facts. Example: "The WHO has no record of endorsing lemon water as a cancer cure on who.int" or "Starlink's official website shows no free tier exists for any country"
- For REAL articles: cite why it is credible. Example: "ISRO's CE-20 engine test is consistent with publicly known Gaganyaan mission timelines" or "iOS 18.4 release matches Apple's official software update page"
- For UNCERTAIN articles: explain exactly what is verifiable vs what is disputed. Example: "The 6.2% GDP projection is cited by some analysts but contradicts IMF estimates of 6.5–7.1%"
- Never write vague reasons like "lack of credible sources" or "unrealistic claims" — always be specific

RED FLAGS RULES:
- Only include redFlags if verdict is "Fake" or "Uncertain"
- Red flags must be exact phrases copied from the article that are suspicious
- Examples: "share before it gets deleted", "secret deal worth zero dollars", "they don't want you to know"
- For "Real" articles, redFlags should be an empty array []

JSON format: {"verdict": "Real" or "Fake" or "Uncertain", "confidenceScore": integer 0-100, "reasons": ["specific reason 1", "specific reason 2", "specific reason 3"], "redFlags": ["exact phrase 1", "exact phrase 2"]}`
          },
          {
            role: 'user',
            content: `Analyze this article: ${articleText}`
          }
        ],
        temperature: 0.3
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

    // Safety net: force confidenceScore to match verdict range if Groq ignores instructions
    if (result.verdict === 'Fake' && result.confidenceScore > 35) {
      result.confidenceScore = Math.floor(Math.random() * 21) + 10; // 10-30
    } else if (result.verdict === 'Uncertain' && (result.confidenceScore < 36 || result.confidenceScore > 64)) {
      result.confidenceScore = Math.floor(Math.random() * 29) + 36; // 36-64
    } else if (result.verdict === 'Real' && result.confidenceScore < 65) {
      result.confidenceScore = Math.floor(Math.random() * 26) + 70; // 70-95
    }

    // Save to Supabase analyses table
    await supabase.from('analyses').insert([{
      article_text: articleText.substring(0, 500),
      verdict: result.verdict,
      confidence_score: result.confidenceScore,
      reasons: result.reasons,
      red_flags: result.redFlags || [],
      input_type: 'text'
    }]);

    // Update global stats
    await supabase.rpc('increment_stats', { verdict_value: result.verdict });

    res.json({
      verdict: result.verdict,
      confidenceScore: result.confidenceScore,
      reasons: result.reasons,
      redFlags: result.redFlags || []
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
