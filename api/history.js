const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    let query = supabase
      .from('analyses')
      .select('id, created_at, article_text, verdict, confidence_score')
      .order('created_at', { ascending: false })
      .limit(20);

    // Filter by userId if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};