BEGIN;
CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS app_users(
 id uuid PRIMARY KEY,
 email text NOT NULL UNIQUE CHECK(length(email)<=254),
 password_hash text,
 external_subject text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(password_hash IS NOT NULL OR external_subject IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS workspaces(
 user_id uuid PRIMARY KEY REFERENCES app_users(id),
 document jsonb NOT NULL CHECK(jsonb_typeof(document)='object') CHECK((document->>'revision')::integer>=0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions(
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES app_users(id),
 access_hash text NOT NULL UNIQUE CHECK(length(access_hash)=64),
 refresh_hash text NOT NULL UNIQUE CHECK(length(refresh_hash)=64),
 used_refresh_hashes jsonb NOT NULL CHECK(jsonb_typeof(used_refresh_hashes)='array'),
 document jsonb NOT NULL CHECK(jsonb_typeof(document)='object')
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_used_refresh_idx ON sessions USING gin(used_refresh_hashes);
CREATE TABLE IF NOT EXISTS audit_events(
 sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id uuid NOT NULL UNIQUE,
 user_id uuid NOT NULL REFERENCES app_users(id),
 document jsonb NOT NULL CHECK(jsonb_typeof(document)='object'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_user_idx ON audit_events(user_id,sequence);
CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit events are append-only'; END $$;
DROP TRIGGER IF EXISTS audit_immutable ON audit_events;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
INSERT INTO schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
COMMIT;
