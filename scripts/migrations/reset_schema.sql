-- ============================================================
-- Smart Internship System — Full Database Reset Schema
-- Run this in Supabase → SQL Editor to start fresh.
-- This drops all old tables and recreates them cleanly.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Drop all old tables (in correct dependency order)
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS evaluation_runs     CASCADE;
DROP TABLE IF EXISTS feedback_events     CASCADE;
DROP TABLE IF EXISTS assessments         CASCADE;
DROP TABLE IF EXISTS recommendations     CASCADE;
DROP TABLE IF EXISTS resumes             CASCADE;
DROP TABLE IF EXISTS internships         CASCADE;
DROP TABLE IF EXISTS users               CASCADE;

-- ─────────────────────────────────────────────────────────────
-- STEP 2: Enable required extensions
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────────────────
-- TABLE: users
-- Stores student and admin accounts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  password_hash text,
  role          text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  name          text,
  phone         text,
  college       text,
  degree        text,
  department    text,
  year          int,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: internships
-- Stores all internship postings
-- ─────────────────────────────────────────────────────────────
CREATE TABLE internships (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  company         text NOT NULL,
  description     text,
  required_skills text[]          DEFAULT '{}',
  location        text,
  duration        text,
  stipend         text            DEFAULT 'Unpaid',
  apply_link      text,
  category        text            DEFAULT 'General',
  is_active       boolean         NOT NULL DEFAULT true,
  embedding       vector(768),
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now()
);

-- Index for fast AI semantic search (cosine similarity)
CREATE INDEX internships_embedding_idx
  ON internships USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─────────────────────────────────────────────────────────────
-- TABLE: resumes
-- Stores uploaded resume data and parsed skill info
-- ─────────────────────────────────────────────────────────────
CREATE TABLE resumes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url         text NOT NULL,
  file_name        text NOT NULL,
  raw_text         text,
  extracted_skills jsonb    NOT NULL DEFAULT '{}'::jsonb,
  ats_score        float    NOT NULL DEFAULT 0,
  strengths        text[]   NOT NULL DEFAULT '{}',
  weaknesses       text[]   NOT NULL DEFAULT '{}',
  improvements     text[]   NOT NULL DEFAULT '{}',
  embedding        vector(768),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: assessments
-- Stores MCQ assessment sessions and results
-- ─────────────────────────────────────────────────────────────
CREATE TABLE assessments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id       uuid REFERENCES resumes(id) ON DELETE SET NULL,
  questions       jsonb    NOT NULL DEFAULT '[]'::jsonb,
  user_answers    jsonb    NOT NULL DEFAULT '[]'::jsonb,
  score           int      NOT NULL DEFAULT 0,
  total_questions int      NOT NULL DEFAULT 0,
  correct_answers int      NOT NULL DEFAULT 0,
  percentage      float    NOT NULL DEFAULT 0,
  time_taken      int,
  status          text     NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: recommendations
-- Stores AI-generated internship matches for each student
-- ─────────────────────────────────────────────────────────────
CREATE TABLE recommendations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  internship_id     uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  match_percentage  float NOT NULL DEFAULT 0,
  skill_score       float NOT NULL DEFAULT 0,
  assessment_score  float NOT NULL DEFAULT 0,
  matched_skills    text[] NOT NULL DEFAULT '{}',
  score             float,
  ats_score         float,
  reasoning         text,
  match_factors     jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, internship_id)
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: feedback_events
-- Records user interaction signals for improving recommendations
-- ─────────────────────────────────────────────────────────────
CREATE TABLE feedback_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  internship_id uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  event_type    text NOT NULL CHECK (event_type IN (
    'click', 'save', 'apply', 'outcome_hired', 'outcome_rejected'
  )),
  weight        float NOT NULL DEFAULT 1.0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX feedback_events_user_internship_idx ON feedback_events (user_id, internship_id);
CREATE INDEX feedback_events_created_at_idx ON feedback_events (created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- TABLE: evaluation_runs
-- Stores offline AI evaluation metrics
-- ─────────────────────────────────────────────────────────────
CREATE TABLE evaluation_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at         timestamptz NOT NULL DEFAULT now(),
  k              int   NOT NULL DEFAULT 10,
  precision_at_k float,
  recall_at_k    float,
  mrr            float,
  ndcg           float,
  ats_mae        float,
  avg_latency_ms float,
  model_used     text  NOT NULL DEFAULT 'gemma4:e4b',
  metadata       jsonb
);

-- ─────────────────────────────────────────────────────────────
-- STEP 3: Enable Row Level Security (RLS) on all tables
-- ─────────────────────────────────────────────────────────────
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE internships       ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_runs   ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- STEP 4: RLS Policies
-- Allow the service_role (used by Next.js backend) full access.
-- Public reads allowed on internships only.
-- ─────────────────────────────────────────────────────────────

-- users: service_role full access
CREATE POLICY "Service role full access on users"
  ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- internships: public can read active listings, service_role manages all
CREATE POLICY "Public read active internships"
  ON internships FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access on internships"
  ON internships FOR ALL TO service_role USING (true) WITH CHECK (true);

-- resumes: service_role full access
CREATE POLICY "Service role full access on resumes"
  ON resumes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- assessments: service_role full access
CREATE POLICY "Service role full access on assessments"
  ON assessments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- recommendations: service_role full access
CREATE POLICY "Service role full access on recommendations"
  ON recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- feedback_events: service_role full access
CREATE POLICY "Service role full access on feedback_events"
  ON feedback_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- evaluation_runs: service_role full access
CREATE POLICY "Service role full access on evaluation_runs"
  ON evaluation_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- Done! All tables created successfully.
-- ─────────────────────────────────────────────────────────────
