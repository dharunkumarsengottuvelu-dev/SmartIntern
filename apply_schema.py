import asyncio
import asyncpg
import os

async def main():
    db_url = "postgresql://postgres:postgres@host.docker.internal:54322/postgres"
    print(f"Connecting to {db_url}...")
    conn = await asyncpg.connect(db_url)
    
    with open("scripts/migrations/001_pgvector.sql", "r", encoding="utf-8") as f:
        sql = f.read()
    
    print("Executing schema...")
    await conn.execute(sql)
    print("Done!")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
