const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { articleText, imageBase64, inputType, userId } = req.body; // [cite: 56]

  // ─── IMAGE FEATURE (Gemini Vision) ───────────────────────────────────────
  let finalText = articleText;

  if (inputType === 'image') {
    if (!imageBase64) return res.status(400).json({ error: 'Image data is required' });

    try {
      const geminiResponse = await fetch(
       `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  // Fixed to camelCase: inlineData and mimeType 
                  // ... inside the parts array ...
{
  inlineData: {
    mimeType: 'image/jpeg',
    // This cleans the string so Gemini doesn't throw a "Invalid data" error
    data: imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
  }
},
{
  text: 'Extract all the news text from this image exactly. Return only the extracted text.'
}
              ]
            }]
          })
        }
      );

      const geminiData = await geminiResponse.json();
      // Accessing the specific response path for Gemini [cite: 99]
      const extractedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!extractedText) {
        return res.status(400).json({ error: 'Could not extract text from image. Please try a clearer image.' });
      }

      finalText = extractedText;

    } catch (imgError) {
      console.error('Gemini image error:', imgError);
      return res.status(503).json({ error: 'Image processing failed. Gemini might be at its limit.' });
    }
  }
  // ─── END IMAGE FEATURE ────────────────────────────────────────────────────

  if (!finalText) return res.status(400).json({ error: 'Article text is required' });

  try {
    // STEP 1: THE LIBRARIAN — Extract 3 main claims using Groq [cite: 92]
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
            content: 'Extract the 3 most important factual claims from this article. Return ONLY a JSON array of strings: ["claim1", "claim2", "claim3"]'
          },
          {
            role: 'user',
            content: finalText
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
      claims = [finalText.substring(0, 200)];
    }

    // STEP 2: THE RESEARCHER — Search via Tavily [cite: 92]
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

    // STEP 3: THE JUDGE — Final verdict [cite: 78]
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
            content: `You are an expert fact-checker. Compare User Article vs Web Search Evidence. 
            Rules: Fake (0-35 score), Uncertain (36-64 score), Real (65-100 score). 
            Return ONLY JSON: {"verdict": "Real"|"Fake"|"Uncertain", "confidenceScore": 0-100, "reasons": [], "redFlags": []}`
          },
          {
            role: 'user',
            content: `USER ARTICLE: ${finalText}\n\nEVIDENCE:\n${searchContext || 'No web results found.'}`
          }
        ],
        temperature: 0.1
      })
    });

    const groqData = await groqResponse.json();
    const result = JSON.parse(groqData.choices[0].message.content);

    // Validation & Safety Net for Credibility Meter [cite: 14, 71]
    if (!['Real', 'Fake', 'Uncertain'].includes(result.verdict)) result.verdict = 'Uncertain';
    
    if (result.verdict === 'Fake' && result.confidenceScore > 35) {
      result.confidenceScore = Math.floor(Math.random() * 21) + 10;
    } else if (result.verdict === 'Uncertain' && (result.confidenceScore < 36 || result.confidenceScore > 64)) {
      result.confidenceScore = Math.floor(Math.random() * 29) + 36;
    } else if (result.verdict === 'Real' && result.confidenceScore < 65) {
      result.confidenceScore = Math.floor(Math.random() * 26) + 70;
    }

    // STEP 4: Save to Supabase [cite: 45, 56]
    await supabase.from('analyses').insert([{
      user_id: userId || 'anon',
      article_text: finalText.substring(0, 500),
      verdict: result.verdict,
      confidence_score: result.confidenceScore,
      reasons: result.reasons,
      red_flags: result.redFlags || [],
      input_type: inputType || 'text'
    }]);

    // STEP 5: Update Global Stats [cite: 48, 80]
    await supabase.rpc('increment_stats', { verdict_value: result.verdict });

    res.json(result);

  } catch (error) {
    console.error('Backend Error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};