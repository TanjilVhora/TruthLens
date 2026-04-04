const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { articleText, imageBase64, inputType, userId } = req.body;

  let finalText = articleText;

  // ─── IMAGE FEATURE (Gemini Vision) ───────────────────────────────────────
  if (inputType === 'image') {
    if (!imageBase64) return res.status(400).json({ error: 'Image data is required' });

    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
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
      
      if (geminiData.error) {
        console.error('Gemini API Error:', geminiData.error);
        return res.status(500).json({ error: 'Gemini API failed to process image.' });
      }

      const extractedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!extractedText) {
        return res.status(400).json({ error: 'Could not extract text from image. Please try a clearer image.' });
      }

      finalText = extractedText;

    } catch (imgError) {
      console.error('Gemini image error:', imgError);
      return res.status(503).json({ error: 'Image processing failed.' });
    }
  }
  // ─── END IMAGE FEATURE ────────────────────────────────────────────────────

  if (!finalText) return res.status(400).json({ error: 'Article text is required' });

  try {
    // STEP 1: THE LIBRARIAN — Extract Claims
    const claimExtraction = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Extract 3 factual claims. Return ONLY a JSON array: ["c1", "c2", "c3"]' },
          { role: 'user', content: finalText }
        ],
        temperature: 0.1
      })
    });

    const claimData = await claimExtraction.json();
    let claims = [];
    try {
      claims = JSON.parse(claimData.choices[0].message.content);
    } catch(e) {
      claims = [finalText.substring(0, 200)];
    }

    // STEP 2: THE RESEARCHER — Search via Tavily
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

    // STEP 3: THE JUDGE — Final verdict
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
            content: `Return ONLY JSON: {"verdict": "Real"|"Fake"|"Uncertain", "confidenceScore": 0-100, "reasons": [], "redFlags": []}`
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

    // Validation & Safety Net
    if (!['Real', 'Fake', 'Uncertain'].includes(result.verdict)) result.verdict = 'Uncertain';

    // STEP 4: Save to Supabase
    await supabase.from('analyses').insert([{
      user_id: userId || 'anon',
      article_text: finalText.substring(0, 500),
      verdict: result.verdict,
      confidence_score: result.confidenceScore,
      reasons: result.reasons,
      red_flags: result.redFlags || [],
      input_type: inputType || 'text'
    }]);

    // STEP 5: Update Stats
    await supabase.rpc('increment_stats', { verdict_value: result.verdict });

    res.json(result);

  } catch (error) {
    console.error('Backend Error:', error);
    res.status(500).json({ error: 'Server error during analysis.' });
  }
};