const { Client } = require('pg');

async function reloadSchema() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('Schema cache reloaded successfully');
  } catch (err) {
    console.error('Error reloading schema cache:', err);
  } finally {
    await client.end();
  }
}

reloadSchema();
