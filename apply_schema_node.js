const { Client } = require("pg");
const fs = require("fs");

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
  });

  await client.connect();
  const sql0 = fs.readFileSync("scripts/migrations/000_initial_schema.sql", "utf-8");
  await client.query(sql0);
  console.log("000_initial_schema applied!");
  
  const sql1 = fs.readFileSync("scripts/migrations/001_pgvector.sql", "utf-8");
  await client.query(sql1);
  console.log("001_pgvector applied!");
  console.log("Schema applied successfully!");
  await client.end();
}

main().catch(console.error);
