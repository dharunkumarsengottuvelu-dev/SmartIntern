-- 002_fix_schemas.sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS college text,
ADD COLUMN IF NOT EXISTS degree text,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS year int;

ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS match_percentage float,
ADD COLUMN IF NOT EXISTS skill_score float,
ADD COLUMN IF NOT EXISTS assessment_score float,
ADD COLUMN IF NOT EXISTS matched_skills text[];
