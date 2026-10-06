import type { QueryResultRow } from "pg";
import type {
  Workspace,
  Account,
  Consent,
  Transaction,
  Commitment,
} from "../shared/contracts.js";
export interface SqlResult<T> {
  rows: T[];
  rowCount: number | null;
}
export interface SqlClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<SqlResult<T>>;
  release(): void;
}
export interface SqlPool {
  connect(): Promise<SqlClient>;
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<SqlResult<T>>;
  end(): Promise<void>;
}
export async function loadWorkspace(
  client: SqlClient,
  id: string,
  document: Workspace,
): Promise<Workspace> {
  const consents = await client.query<{ document: Consent }>(
    "SELECT document FROM consents WHERE user_id=$1 ORDER BY granted_at,id",
    [id],
  );
  const accounts = await client.query<{ document: Account }>(
    "SELECT document FROM financial_accounts WHERE user_id=$1 ORDER BY id",
    [id],
  );
  const transactions = await client.query<{ document: Transaction }>(
    "SELECT document FROM financial_transactions WHERE user_id=$1 ORDER BY transaction_date,id",
    [id],
  );
  const commitments = await client.query<{ document: Commitment }>(
    "SELECT document FROM recurring_commitments WHERE user_id=$1 ORDER BY next_date,id",
    [id],
  );
  return {
    ...document,
    profile: {
      ...document.profile,
      timeZone: document.profile.timeZone ?? "Australia/Adelaide",
      onboardingCompleted: document.profile.onboardingCompleted ?? false,
    },
    consents: consents.rows.map((r) => r.document),
    accounts: accounts.rows.map((r) => r.document),
    transactions: transactions.rows.map((r) => r.document),
    commitments: commitments.rows.map((r) => r.document),
  };
}
export async function persistWorkspace(
  client: SqlClient,
  id: string,
  workspace: Workspace,
): Promise<void> {
  const { accounts, consents, transactions, commitments, ...profile } =
    workspace;
  await client.query(
    "UPDATE workspaces SET document=$2,updated_at=now() WHERE user_id=$1",
    [id, profile],
  );
  for (const c of consents)
    await client.query(
      "INSERT INTO consents(id,user_id,institution,provider,status,granted_at,expires_at,document) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id,id) DO UPDATE SET status=EXCLUDED.status,expires_at=EXCLUDED.expires_at,document=EXCLUDED.document",
      [
        c.id,
        id,
        c.institution,
        c.provider,
        c.status,
        c.grantedAt,
        c.expiresAt,
        c,
      ],
    );
  for (const a of accounts)
    await client.query(
      "INSERT INTO financial_accounts(id,user_id,connection_id,provider_id,amount_minor,currency,role,document) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id,id) DO UPDATE SET amount_minor=EXCLUDED.amount_minor,role=EXCLUDED.role,document=EXCLUDED.document",
      [
        a.id,
        id,
        a.connectionId,
        a.providerId,
        a.balance,
        a.currency,
        a.role,
        a,
      ],
    );
  for (const t of transactions)
    await client.query(
      "INSERT INTO financial_transactions(id,user_id,account_id,provider_id,amount_minor,transaction_date,status,category,document) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(user_id,id) DO UPDATE SET amount_minor=EXCLUDED.amount_minor,transaction_date=EXCLUDED.transaction_date,status=EXCLUDED.status,category=EXCLUDED.category,document=EXCLUDED.document",
      [
        t.id,
        id,
        t.accountId,
        t.providerId,
        t.amount,
        t.date,
        t.status,
        t.category,
        t,
      ],
    );
  for (const c of commitments)
    await client.query(
      "INSERT INTO recurring_commitments(id,user_id,account_id,amount_minor,currency,frequency,kind,status,next_date,document) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(user_id,id) DO UPDATE SET account_id=EXCLUDED.account_id,amount_minor=EXCLUDED.amount_minor,frequency=EXCLUDED.frequency,kind=EXCLUDED.kind,status=EXCLUDED.status,next_date=EXCLUDED.next_date,document=EXCLUDED.document",
      [
        c.id,
        id,
        c.accountId,
        c.amount,
        c.currency,
        c.frequency,
        c.kind,
        c.status,
        c.nextDate,
        c,
      ],
    );
  await client.query(
    "DELETE FROM recurring_commitments WHERE user_id=$1 AND NOT(id=ANY($2::uuid[]))",
    [id, commitments.map((c) => c.id)],
  );
}
