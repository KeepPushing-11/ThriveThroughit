-- Create responses table and trigger to NOTIFY on insert
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  survey_id TEXT NOT NULL,
  respondent_id TEXT,
  answers JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE OR REPLACE FUNCTION notify_response() RETURNS trigger AS $$
DECLARE
  payload TEXT;
BEGIN
  payload := json_build_object('event','response:created','companyId',NEW.company_id,'surveyId',NEW.survey_id,'response',row_to_json(NEW))::text;
  PERFORM pg_notify('responses_channel', payload);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS responses_notify ON responses;
CREATE TRIGGER responses_notify AFTER INSERT ON responses FOR EACH ROW EXECUTE PROCEDURE notify_response();
