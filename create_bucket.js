const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
  });

  await client.connect();
  
  await client.query(`
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('resumes', 'resumes', true) 
    ON CONFLICT DO NOTHING;
  `);

  // We also need to grant access to the bucket objects
  await client.query(`
    CREATE POLICY "Public Access" ON storage.objects FOR ALL USING (bucket_id = 'resumes');
  `).catch(() => console.log("Policy might already exist"));

  console.log("Storage bucket created successfully!");
  await client.end();
}

main().catch(console.error);
