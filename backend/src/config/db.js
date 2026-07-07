const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const query = async (text, params) => {
  const { data, error } = await supabase.rpc('exec_sql', { query_text: text, params });
  if (error) throw error;
  return { rows: data || [] };
};

const getClient = () => supabase;

module.exports = { query, getClient };
