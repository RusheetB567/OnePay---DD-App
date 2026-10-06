BEGIN;
CREATE TABLE IF NOT EXISTS consents(
 id uuid NOT NULL,
 user_id uuid NOT NULL REFERENCES app_users(id),
 institution text NOT NULL CHECK(length(institution)<=80),
 provider text NOT NULL,
 status text NOT NULL CHECK(status IN('active','revoked','expired')),
 granted_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL CHECK(expires_at>granted_at),
 document jsonb NOT NULL,
 PRIMARY KEY(user_id,id),
 UNIQUE(id)
);
CREATE INDEX IF NOT EXISTS consents_expiry_idx ON consents(user_id,status,expires_at);
CREATE TABLE IF NOT EXISTS financial_accounts(
 id uuid NOT NULL,
 user_id uuid NOT NULL REFERENCES app_users(id),
 connection_id uuid NOT NULL,
 provider_id text NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor BETWEEN -1000000000000 AND 1000000000000),
 currency text NOT NULL CHECK(currency='AUD'),
 role text NOT NULL CHECK(role IN('spending','bills','savings')),
 document jsonb NOT NULL,
 PRIMARY KEY(user_id,id),
 UNIQUE(id),
 UNIQUE(user_id,connection_id,provider_id),
 FOREIGN KEY(user_id,connection_id) REFERENCES consents(user_id,id)
);
CREATE TABLE IF NOT EXISTS financial_transactions(
 id uuid NOT NULL,
 user_id uuid NOT NULL REFERENCES app_users(id),
 account_id uuid NOT NULL,
 provider_id text NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor BETWEEN -100000000 AND 100000000),
 currency text NOT NULL DEFAULT 'AUD' CHECK(currency='AUD'),
 transaction_date date NOT NULL,
 status text NOT NULL CHECK(status IN('posted','pending')),
 category text NOT NULL CHECK(category IN('Housing','Utilities','Subscription','Insurance','Health','Loan','Salary','Other')),
 document jsonb NOT NULL,
 PRIMARY KEY(user_id,id),
 UNIQUE(id),
 UNIQUE(user_id,account_id,provider_id),
 FOREIGN KEY(user_id,account_id) REFERENCES financial_accounts(user_id,id)
);
CREATE INDEX IF NOT EXISTS transaction_feed_idx ON financial_transactions(user_id,transaction_date DESC,id DESC);
CREATE INDEX IF NOT EXISTS transaction_account_idx ON financial_transactions(user_id,account_id,transaction_date DESC);
CREATE INDEX IF NOT EXISTS transaction_category_idx ON financial_transactions(user_id,category,transaction_date DESC);
CREATE TABLE IF NOT EXISTS recurring_commitments(
 id uuid NOT NULL,
 user_id uuid NOT NULL REFERENCES app_users(id),
 account_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor BETWEEN 1 AND 100000000),
 currency text NOT NULL CHECK(currency='AUD'),
 frequency text NOT NULL CHECK(frequency IN('weekly','fortnightly','monthly','quarterly','annually')),
 kind text NOT NULL CHECK(kind IN('income','expense')),
 status text NOT NULL CHECK(status IN('active','paused')),
 next_date date NOT NULL,
 document jsonb NOT NULL,
 PRIMARY KEY(user_id,id),
 UNIQUE(id),
 FOREIGN KEY(user_id,account_id) REFERENCES financial_accounts(user_id,id)
);
CREATE INDEX IF NOT EXISTS commitment_due_idx ON recurring_commitments(user_id,status,next_date);
-- Backfill aggregates created by migration 001 before changing the storage adapter.
INSERT INTO consents SELECT (c->>'id')::uuid,w.user_id,c->>'institution',c->>'provider',c->>'status',(c->>'grantedAt')::timestamptz,(c->>'expiresAt')::timestamptz,c FROM workspaces w CROSS JOIN LATERAL jsonb_array_elements(COALESCE(w.document->'consents','[]')) c ON CONFLICT(user_id,id) DO NOTHING;
INSERT INTO financial_accounts SELECT (a->>'id')::uuid,w.user_id,(a->>'connectionId')::uuid,a->>'providerId',(a->>'balance')::bigint,a->>'currency',a->>'role',a FROM workspaces w CROSS JOIN LATERAL jsonb_array_elements(COALESCE(w.document->'accounts','[]')) a ON CONFLICT(user_id,id) DO NOTHING;
INSERT INTO financial_transactions SELECT (t->>'id')::uuid,w.user_id,(t->>'accountId')::uuid,t->>'providerId',(t->>'amount')::bigint,'AUD',(t->>'date')::date,t->>'status',t->>'category',t FROM workspaces w CROSS JOIN LATERAL jsonb_array_elements(COALESCE(w.document->'transactions','[]')) t ON CONFLICT(user_id,id) DO NOTHING;
INSERT INTO recurring_commitments SELECT (c->>'id')::uuid,w.user_id,(c->>'accountId')::uuid,(c->>'amount')::bigint,c->>'currency',c->>'frequency',c->>'kind',c->>'status',(c->>'nextDate')::date,c FROM workspaces w CROSS JOIN LATERAL jsonb_array_elements(COALESCE(w.document->'commitments','[]')) c ON CONFLICT(user_id,id) DO NOTHING;
UPDATE workspaces SET document=document-'accounts'-'consents'-'transactions'-'commitments';
INSERT INTO schema_migrations(version) VALUES(2) ON CONFLICT DO NOTHING;
COMMIT;
