const { createClient } = require('@supabase/supabase-js');

const url = "https://nrrwptfraridutnfxela.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ycndwdGZyYXJpZHV0bmZ4ZWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MjgyNDcsImV4cCI6MjA5NjEwNDI0N30.hkI3pzb_dj0bJgLKpEavJk32KFAcQcwHpj7zTwQXwzo";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase.from('operatori').select('*');
  console.log("Error:", error);
  console.log("Operatori in Supabase:", JSON.stringify(data, null, 2));
}

main();
