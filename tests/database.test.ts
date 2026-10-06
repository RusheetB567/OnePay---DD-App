import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  PostgresStore,
  newWorkspace,
  audit,
  verifyAudit,
  type UserRecord,
} from "../backend/store.js";
import type { SqlPool } from "../backend/database.js";
import { SyntheticBankingProvider } from "../backend/providers/banking.js";

test("PostgreSQL migrations, persistence, ownership constraints and audit rollback", async () => {
  const db = new PGlite();
  const pool = {
    connect: async () => ({ query: pool.query, release() {} }),
    query: async (sql: string, values?: unknown[]) => {
      const r = await db.query(
        sql,
        values?.map((v) =>
          Array.isArray(v)
            ? "{" + v.join(",") + "}"
            : typeof v === "object" && v !== null
              ? JSON.stringify(v)
              : v,
        ),
      );
      return { rows: r.rows, rowCount: r.affectedRows ?? 0 };
    },
    end: () => db.close(),
  } as SqlPool;
  const store = new PostgresStore(pool, false);
  try {
    for (const name of ["001-foundation.sql", "002-financial-domains.sql"])
      await db.exec(
        await readFile(
          new URL(`../backend/migrations/${name}`, import.meta.url),
          "utf8",
        ),
      );
    const make = (email: string): UserRecord => ({
      id: randomUUID(),
      email,
      passwordHash: "test-hash",
      externalSubject: null,
      workspace: newWorkspace("Test"),
      sessions: [],
      audit: [],
    });
    const a = make("a@example.test"),
      b = make("b@example.test");
    await store.create(a);
    await store.create(b);
    const banking = new SyntheticBankingProvider();
    await store.mutate(a.id, (u) => {
      const connected = banking.connect(
        "Up",
        Date.parse("2026-10-05T00:00:00Z"),
      );
      u.workspace.consents.push(connected.consent);
      u.workspace.accounts.push(...connected.snapshot.accounts);
      u.workspace.transactions.push(...connected.snapshot.transactions);
      audit(u, "CONNECTED", randomUUID(), "2026-10-05T00:00:00Z");
    });
    const saved = (await store.get(a.id))!;
    assert.ok(saved.workspace.transactions.length > 0);
    assert.equal(saved.workspace.accounts.length, 3);
    assert.ok(verifyAudit(saved.audit));
    assert.deepEqual((await store.get(b.id))!.workspace.accounts, []);
    const document = await db.query<{ document: Record<string, unknown> }>(
      "SELECT document FROM workspaces WHERE user_id=$1",
      [a.id],
    );
    assert.equal(document.rows[0]!.document.accounts, undefined);
    await assert.rejects(
      store.mutate(b.id, (u) => {
        u.workspace.accounts.push(saved.workspace.accounts[0]!);
      }),
    );
    assert.equal((await store.get(b.id))!.workspace.accounts.length, 0);
    const tx = saved.workspace.transactions[0]!;
    await assert.rejects(
      store.mutate(a.id, (u) => {
        u.workspace.transactions.push({ ...tx, id: randomUUID() });
      }),
    );
    assert.equal(
      (await store.get(a.id))!.workspace.transactions.length,
      saved.workspace.transactions.length,
    );
    await assert.rejects(
      db.query("DELETE FROM audit_events WHERE user_id=$1", [a.id]),
    );
    assert.ok(await store.health());
    await store.mutateSecurity(a.id, (u) =>
      audit(u, "SECURITY_ONLY", randomUUID(), "2026-10-05T01:00:00Z"),
    );
    assert.ok(verifyAudit((await store.get(a.id))!.audit));
  } finally {
    await store.close();
  }
});
