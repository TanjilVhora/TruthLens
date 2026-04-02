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
            content: 'You are a fake news detection expert. Analyze the given news article and return ONLY a JSON object with NO extra text, NO markdown, NO backticks. JSON format: {"verdict": "Real" or "Fake" or "Uncertain", "confidenceScore": integer 0-100, "reasons": ["reason1", "reason2", "reason3"], "redFlags": ["phrase1", "phrase2"]}'
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