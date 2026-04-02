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
    const { data, error } = await supabase
      .from('stats')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      totalAnalyses: data.total_analyses,
      fakeCount: data.fake_count,
      realCount: data.real_count,
      uncertainCount: data.uncertain_count
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};