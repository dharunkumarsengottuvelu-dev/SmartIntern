const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase DB connection...');
  console.log('URL:', supabaseUrl);

  const tables = ['users', 'internships', 'resumes', 'assessments', 'recommendations'];
  let allWorking = true;

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (error) {
        console.log(`❌ Table '${table}': ERROR -> ${error.message}`);
        allWorking = false;
      } else {
        console.log(`✅ Table '${table}': WORKING (accessible)`);
      }
    } catch (e) {
      console.log(`❌ Table '${table}': EXCEPTION -> ${e.message}`);
      allWorking = false;
    }
  }

  if (allWorking) {
    console.log('\n🎉 SUCCESS: Your Supabase database is connected and fully working!');
  } else {
    console.log('\n⚠️ SOME TABLES ARE NOT WORKING: Make sure to run reset_schema.sql in Supabase SQL Editor if tables are missing.');
  }
  process.exit(0);
}

testConnection();
