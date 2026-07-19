import asyncio
import asyncpg
from core.config import settings
from services.embedding_service import embed_and_store_internship

async def main():
    print(f"Connecting to database...")
    conn = await asyncpg.connect(settings.DATABASE_URL)
    
    internships = await conn.fetch("SELECT * FROM internships WHERE embedding IS NULL")
    print(f"Found {len(internships)} internships to embed.")
    
    for row in internships:
        print(f"Embedding: {row['title']} @ {row['company']}")
        await embed_and_store_internship(
            conn=conn,
            internship_id=str(row['id']),
            title=row['title'],
            company=row['company'],
            description=row['description'] or "",
            required_skills=row['required_skills'] or [],
            category=row['category'] or "",
            location=row['location'] or "",
            duration=row['duration'] or ""
        )
    
    print("Done generating embeddings!")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
