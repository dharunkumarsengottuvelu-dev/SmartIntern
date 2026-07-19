"""
embed_all_internships.py — Seed CSV data into Postgres and generate nomic-embed-text embeddings.

Prerequisites:
  1. Local Postgres running (Supabase CLI or pgvector Docker)
  2. pgvector migration applied:  psql $DATABASE_URL -f scripts/migrations/001_pgvector.sql
  3. Ollama running with nomic-embed-text:  ollama list | grep nomic-embed-text
  4. Merged CSV ready:  python scripts/merge_internship_csvs.py

Usage:
  export DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
  export OLLAMA_BASE_URL=http://localhost:11434
  python scripts/embed_all_internships.py

ALL calls go to local services only. No external network calls are made.
"""

import asyncio
import csv
import json
import os
import sys
from pathlib import Path

import asyncpg
import httpx

DATABASE_URL = os.environ.get("DATABASE_URL")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "nomic-embed-text")
CSV_PATH = "data/internships_merged.csv"

if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable is not set.")
    print("Export it first:  export DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres")
    sys.exit(1)


def build_embedding_text(row: dict) -> str:
    """
    Canonical text representation for an internship embedding.
    This MUST match the text format used in ai-service/services/embedding_service.py
    for cosine similarity to be meaningful.
    """
    skills = json.loads(row["required_skills"]) if row.get("required_skills") else []
    nice_to_have = json.loads(row["nice_to_have_skills"]) if row.get("nice_to_have_skills") else []
    nice_str = f"Nice to have: {', '.join(nice_to_have)}. " if nice_to_have else ""

    return (
        f"{row['title']} at {row['company']}. "
        f"Category: {row.get('category', '')}. "
        f"Location: {row.get('location', '')}. "
        f"Duration: {row.get('duration', '')}. "
        f"{row.get('description', '')} "
        f"Required skills: {', '.join(skills)}. {nice_str}"
    ).strip()


async def get_embedding(client: httpx.AsyncClient, text: str) -> list[float]:
    resp = await client.post(
        f"{OLLAMA_BASE_URL}/api/embeddings",
        json={"model": EMBED_MODEL, "prompt": text},
        timeout=60,
    )
    resp.raise_for_status()
    vector = resp.json().get("embedding", [])
    if not vector:
        raise ValueError("Empty embedding returned from Ollama")
    return vector


async def check_ollama_ready(client: httpx.AsyncClient) -> None:
    try:
        resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        resp.raise_for_status()
        available = [m["name"] for m in resp.json().get("models", [])]
        base = EMBED_MODEL.split(":")[0]
        if not any(n == EMBED_MODEL or n.startswith(base + ":") for n in available):
            print(f"ERROR: {EMBED_MODEL} is not in the local Ollama model store.")
            print(f"Run: ollama pull {EMBED_MODEL}")
            sys.exit(1)
        print(f"✓ Ollama reachable. {EMBED_MODEL} is available.")
    except httpx.HTTPError as exc:
        print(f"ERROR: Cannot reach Ollama at {OLLAMA_BASE_URL}: {exc}")
        sys.exit(1)


async def main() -> None:
    if not Path(CSV_PATH).exists():
        print(f"ERROR: CSV not found: {CSV_PATH}")
        print("Run first: python scripts/merge_internship_csvs.py")
        sys.exit(1)

    with open(CSV_PATH, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    print(f"Loaded {len(rows)} internships from {CSV_PATH}")

    conn = await asyncpg.connect(DATABASE_URL)
    print("✓ Postgres connected")

    async with httpx.AsyncClient() as client:
        await check_ollama_ready(client)

        print(f"\nEmbedding {len(rows)} internships using {EMBED_MODEL} (local Ollama only)...")
        print("This may take several minutes on CPU-only hardware.\n")

        success = 0
        failed = 0

        for i, row in enumerate(rows, 1):
            try:
                text = build_embedding_text(row)
                vector = await get_embedding(client, text)

                # Upsert — safe to re-run
                await conn.execute(
                    """
                    INSERT INTO internships (
                        id, title, company, description, required_skills,
                        nice_to_have_skills, location, mode, duration, stipend,
                        eligibility, openings, apply_link, is_active, category,
                        domain, application_count, view_count, posted_by,
                        created_at, updated_at, embedding
                    ) VALUES (
                        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
                        $16,$17,$18,$19,$20,$21,$22
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        embedding = EXCLUDED.embedding,
                        updated_at = EXCLUDED.updated_at
                    """,
                    row["id"],
                    row["title"],
                    row["company"],
                    row["description"],
                    row["required_skills"],
                    row["nice_to_have_skills"],
                    row["location"],
                    row.get("mode", ""),
                    row["duration"],
                    row.get("stipend", "Paid"),
                    row.get("eligibility") or None,
                    int(row["openings"]) if row.get("openings") and row["openings"].strip().isdigit() else None,
                    row.get("apply_link", ""),
                    row.get("is_active", "true").lower() == "true",
                    row.get("category", ""),
                    row.get("domain", "[]"),
                    int(row.get("application_count", "0") or "0"),
                    int(row.get("view_count", "0") or "0"),
                    row.get("posted_by") or None,
                    row.get("created_at"),
                    row.get("updated_at"),
                    vector,
                )
                success += 1
            except Exception as exc:
                print(f"  ERROR row {i} id={row.get('id', '?')}: {exc}")
                failed += 1

            if i % 50 == 0 or i == len(rows):
                print(f"  Progress: {i}/{len(rows)} (✓ {success} | ✗ {failed})")

    await conn.close()
    print(f"\nDone — {success} internships embedded, {failed} failed.")
    print("No external calls were made. All embeddings generated locally via Ollama.")


if __name__ == "__main__":
    asyncio.run(main())
