import { randomUUID, createHash } from "node:crypto";
import { Pool } from "pg";
import { loadWorkspace, persistWorkspace, type SqlPool } from "./database.js";
import type { AuditEvent, Workspace } from "../shared/contracts.js";
export interface StoredSession {
  id: string;
  device: string;
  accessHash: string;
  refreshHash: string;
  usedRefreshHashes: string[];
  accessExpires: number;
  expiresAt: number;
  createdAt: number;
  lastSeen: number;
  authenticatedAt: number;
  revoked: boolean;
}
export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string | null;
  externalSubject: string | null;
  workspace: Workspace;
  sessions: StoredSession[];
  audit: AuditEvent[];
}
export interface Store {
  findEmail(email: string): Promise<UserRecord | null>;
  findExternal(subject: string): Promise<UserRecord | null>;
  findToken(
    hash: string,
    kind: "access" | "refresh",
  ): Promise<UserRecord | null>;
  get(id: string): Promise<UserRecord | null>;
  create(user: UserRecord): Promise<void>;
  mutate<T>(id: string, operation: (record: UserRecord) => T): Promise<T>;
  mutateSecurity<T>(
    id: string,
    operation: (record: UserRecord) => T,
  ): Promise<T>;
  health(): Promise<boolean>;
  close(): Promise<void>;
}
export function newWorkspace(name: string): Workspace {
  return {
    profile: {
      name,
      buffer: 50000,
      theme: "system",
      reminders: true,
      notificationPrivacy: "private",
    },
    accounts: [],
    consents: [],
    transactions: [],
    commitments: [],
    ignoredPatterns: [],
    revision: 0,
  };
}
export function audit(
  record: UserRecord,
  action: string,
  requestId: string,
  at: string,
): void {
  const previousHash = record.audit.at(-1)?.hash || "GENESIS";
  const event = {
    id: randomUUID(),
    userId: record.id,
    action,
    requestId,
    at,
    previousHash,
  };
  record.audit.push({ ...event, hash: hashAudit(event) });
}
function hashAudit(event: Omit<AuditEvent, "hash">) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        event.id,
        event.userId,
        event.action,
        event.requestId,
        event.at,
        event.previousHash,
      ]),
    )
    .digest("hex");
}
export function verifyAudit(events: AuditEvent[]): boolean {
  let previousHash = "GENESIS";
  for (const event of events) {
    const { hash, ...body } = event;
    if (body.previousHash !== previousHash || hashAudit(body) !== hash)
      return false;
    previousHash = hash;
  }
  return true;
}
export class MemoryStore implements Store {
  private users = new Map<string, UserRecord>();
  async get(id: string) {
    return structuredClone(this.users.get(id) || null);
  }
  async findEmail(email: string) {
    return structuredClone(
      [...this.users.values()].find((u) => u.email === email) || null,
    );
  }
  async findExternal(subject: string) {
    return structuredClone(
      [...this.users.values()].find((u) => u.externalSubject === subject) ||
        null,
    );
  }
  async findToken(hash: string, kind: "access" | "refresh") {
    return structuredClone(
      [...this.users.values()].find((u) =>
        u.sessions.some((s) =>
          kind === "access"
            ? s.accessHash === hash
            : s.refreshHash === hash || s.usedRefreshHashes.includes(hash),
        ),
      ) || null,
    );
  }
  async create(user: UserRecord) {
    if (
      [...this.users.values()].some(
        (u) =>
          u.email === user.email ||
          (user.externalSubject && u.externalSubject === user.externalSubject),
      )
    )
      throw new Error("Duplicate user");
    this.users.set(user.id, structuredClone(user));
  }
  async mutate<T>(id: string, operation: (record: UserRecord) => T) {
    const user = this.users.get(id);
    if (!user) throw new Error("User unavailable");
    const copy = structuredClone(user);
    const result = operation(copy);
    this.users.set(id, copy);
    return result;
  }
  async close() {}
  mutateSecurity<T>(id: string, operation: (record: UserRecord) => T) {
    return this.mutate(id, operation);
  }
  async health() {
    return true;
  }
}
export class PostgresStore implements Store {
  readonly pool: SqlPool;
  constructor(url: string | SqlPool, requireTls: boolean) {
    this.pool =
      typeof url === "string"
        ? new Pool({
            connectionString: url,
            ssl: requireTls ? { rejectUnauthorized: true } : undefined,
            max: 10,
            statement_timeout: 10000,
          })
        : url;
  }
  private async lookup(
    column: "id" | "email" | "external_subject",
    value: string,
  ): Promise<UserRecord | null> {
    const result = await this.pool.query<{ id: string }>(
      `SELECT id FROM app_users WHERE ${column}=$1`,
      [value],
    );
    return result.rows[0] ? this.get(result.rows[0].id, false) : null;
  }
  findEmail(email: string) {
    return this.lookup("email", email);
  }
  findExternal(subject: string) {
    return this.lookup("external_subject", subject);
  }
  async findToken(hash: string, kind: "access" | "refresh") {
    const result = await this.pool.query<{ user_id: string }>(
      kind === "access"
        ? "SELECT user_id FROM sessions WHERE access_hash=$1"
        : "SELECT user_id FROM sessions WHERE refresh_hash=$1 OR used_refresh_hashes ? $1",
      [hash],
    );
    return result.rows[0] ? this.get(result.rows[0].user_id, false) : null;
  }
  async get(id: string, includeWorkspace = true) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const r = await client.query<{
        id: string;
        email: string;
        password_hash: string | null;
        external_subject: string | null;
        workspace: Workspace;
      }>(
        "SELECT u.*, w.document AS workspace FROM app_users u JOIN workspaces w ON w.user_id=u.id WHERE u.id=$1",
        [id],
      );
      const user = r.rows[0];
      if (!user) {
        await client.query("COMMIT");
        return null;
      }
      const sessions = await client.query<{ document: StoredSession }>(
        "SELECT document FROM sessions WHERE user_id=$1",
        [id],
      );
      const events = await client.query<{ document: AuditEvent }>(
        "SELECT document FROM audit_events WHERE user_id=$1 ORDER BY sequence",
        [id],
      );
      const record = {
        id: user.id,
        email: user.email,
        passwordHash: user.password_hash,
        externalSubject: user.external_subject,
        workspace: includeWorkspace
          ? await loadWorkspace(client, id, user.workspace)
          : user.workspace,
        sessions: sessions.rows.map((s) => s.document),
        audit: events.rows.map((e) => e.document),
      };
      await client.query("COMMIT");
      return record;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async create(user: UserRecord) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO app_users(id,email,password_hash,external_subject) VALUES($1,$2,$3,$4)",
        [user.id, user.email, user.passwordHash, user.externalSubject],
      );
      await client.query(
        "INSERT INTO workspaces(user_id,document) VALUES($1,$2)",
        [user.id, user.workspace],
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  async mutate<T>(
    id: string,
    operation: (record: UserRecord) => T,
  ): Promise<T> {
    return this.mutateRecord(id, operation, true);
  }
  async mutateSecurity<T>(
    id: string,
    operation: (record: UserRecord) => T,
  ): Promise<T> {
    return this.mutateRecord(id, operation, false);
  }
  private async mutateRecord<T>(
    id: string,
    operation: (record: UserRecord) => T,
    includeWorkspace: boolean,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const users = await client.query<{
        id: string;
        email: string;
        password_hash: string | null;
        external_subject: string | null;
      }>("SELECT * FROM app_users WHERE id=$1 FOR UPDATE", [id]);
      const u = users.rows[0];
      if (!u) throw new Error("User unavailable");
      const workspace = await client.query<{ document: Workspace }>(
        "SELECT document FROM workspaces WHERE user_id=$1",
        [id],
      );
      const sessions = await client.query<{ document: StoredSession }>(
        "SELECT document FROM sessions WHERE user_id=$1",
        [id],
      );
      const events = await client.query<{ document: AuditEvent }>(
        "SELECT document FROM audit_events WHERE user_id=$1 ORDER BY sequence",
        [id],
      );
      const record: UserRecord = {
        id: u.id,
        email: u.email,
        passwordHash: u.password_hash,
        externalSubject: u.external_subject,
        workspace: includeWorkspace
          ? await loadWorkspace(client, id, workspace.rows[0]!.document)
          : workspace.rows[0]!.document,
        sessions: sessions.rows.map((s) => s.document),
        audit: events.rows.map((e) => e.document),
      };
      const oldAuditLength = record.audit.length;
      const result = operation(record);
      if (includeWorkspace)
        await persistWorkspace(client, id, record.workspace);
      for (const s of record.sessions)
        await client.query(
          "INSERT INTO sessions(id,user_id,access_hash,refresh_hash,used_refresh_hashes,document) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET access_hash=EXCLUDED.access_hash,refresh_hash=EXCLUDED.refresh_hash,used_refresh_hashes=EXCLUDED.used_refresh_hashes,document=EXCLUDED.document",
          [
            s.id,
            id,
            s.accessHash,
            s.refreshHash,
            JSON.stringify(s.usedRefreshHashes),
            s,
          ],
        );
      for (const event of record.audit.slice(oldAuditLength))
        await client.query(
          "INSERT INTO audit_events(id,user_id,document) VALUES($1,$2,$3)",
          [event.id, id, event],
        );
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  async close() {
    await this.pool.end();
  }
  async health() {
    await this.pool.query("SELECT 1");
    return true;
  }
}
