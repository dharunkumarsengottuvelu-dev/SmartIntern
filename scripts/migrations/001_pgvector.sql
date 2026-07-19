-- SmartIntern pgvector schema migration
-- Run against your LOCAL Postgres (Supabase CLI or plain pgvector Docker image)
-- NOT against a hosted *.supabase.co project.
--
-- Run:
--   psql "$DATABASE_URL" -f scripts/migrations/001_pgvector.sql
-- Or via Supabase CLI:
--   supabase db execute --file scripts/migrations/001_pgvector.sql

-- Enable pgvector extension (already bundled in Supabase CLI and pgvector/pgvector Docker image)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to internships
ALTER TABLE internships ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Add embedding column to resumes
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS embedding vector(768);

-- IVFFlat index for cosine similarity search on internships
-- lists=100 is appropriate for ~500 rows; increase for larger datasets
CREATE INDEX IF NOT EXISTS internships_embedding_idx
  ON internships USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Feedback events table — records user interaction signals for recommendation reweighting
CREATE TABLE IF NOT EXISTS feedback_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  internship_id uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  event_type    text NOT NULL CHECK (event_type IN (
    'click', 'save', 'apply', 'outcome_hired', 'outcome_rejected'
  )),
  weight        float NOT NULL DEFAULT 1.0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_events_user_internship_idx
  ON feedback_events (user_id, internship_id);

CREATE INDEX IF NOT EXISTS feedback_events_created_at_idx
  ON feedback_events (created_at DESC);

-- Evaluation runs table — stores offline evaluation metrics
CREATE TABLE IF NOT EXISTS evaluation_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at         timestamptz NOT NULL DEFAULT now(),
  k              int NOT NULL DEFAULT 10,
  precision_at_k float,
  recall_at_k    float,
  mrr            float,
  ndcg           float,
  ats_mae        float,
  avg_latency_ms float,
  model_used     text NOT NULL DEFAULT 'gemma4:e4b',
  metadata       jsonb
);
