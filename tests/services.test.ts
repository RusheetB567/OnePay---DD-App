import test from "node:test";
import assert from "node:assert/strict";
import { newWorkspace, type UserRecord } from "../backend/store.js";
import { SyntheticBankingProvider } from "../backend/providers/banking.js";
import {
  transactionPage,
  transactionQuerySchema,
  subscriptionSummary,
} from "../backend/services/queries.js";
import { notifications } from "../backend/services/notifications.js";
import { FinancialService } from "../backend/services/financial.js";
import { recurringPatterns } from "../shared/finance.js";
import { loadConfig } from "../backend/config.js";
test("pagination is stable, filters bind cursors, and account ownership is enforced", () => {
  const w = newWorkspace("Alex");
  const b = new SyntheticBankingProvider().connect(
    "Up",
    Date.parse("2026-10-05T00:00:00Z"),
  );
  Object.assign(w, {
    consents: [b.consent],
    accounts: b.snapshot.accounts,
    transactions: b.snapshot.transactions,
  });
  const q = transactionQuerySchema.parse({ limit: 2 });
  const first = transactionPage(w, q);
  assert.equal(first.items.length, 2);
  assert.ok(first.nextCursor);
  const second = transactionPage(w, { ...q, cursor: first.nextCursor! });
  assert.ok(second.items.every((t) => !first.items.some((x) => x.id === t.id)));
  assert.throws(() =>
    transactionPage(w, { ...q, search: "other", cursor: first.nextCursor! }),
  );
  assert.throws(() =>
    transactionPage(w, {
      ...q,
      accountId: "00000000-0000-4000-8000-000000000000",
    }),
  );
  assert.throws(() => transactionQuerySchema.parse({ limit: 101 }));
  assert.throws(() => transactionQuerySchema.parse({ from: "2026-02-30" }));
  const subscriptions = transactionPage(
    w,
    transactionQuerySchema.parse({ filter: "Subscriptions" }),
  );
  assert.ok(subscriptions.items.every((t) => t.category === "Subscription"));
  const service = new FinancialService();
  const pattern = recurringPatterns(w.transactions).find(
    (p) => p.merchant === "Netflix",
  )!;
  service.review(w, pattern.key, "confirm");
  assert.equal(subscriptionSummary(w).annual, pattern.amount * 12);
  assert.throws(() => service.review(w, pattern.key, "confirm"));
  const user = { workspace: w, audit: [] } as unknown as UserRecord;
  w.profile.notificationPrivacy = "hidden";
  assert.ok(
    notifications(user, "2026-10-05", Date.parse("2026-10-05")).every(
      (n) => n.title === "OnePay update" && !n.message.includes("Netflix"),
    ),
  );
  w.profile.reminders = false;
  assert.equal(
    notifications(user, "2026-10-05", Date.parse("2026-10-05")).length,
    0,
  );
});
test("configuration rejects incomplete identity and public release environments", () => {
  assert.throws(() => loadConfig({ NODE_ENV: "staging" }));
  assert.throws(() =>
    loadConfig({ OIDC_ISSUER: "https://issuer.example.test" }),
  );
  assert.throws(() =>
    loadConfig({ ALLOWED_ORIGINS: "https://example.test/path" }),
  );
  assert.equal(loadConfig({}).API_PORT, 4000);
});

test("sample synchronization does not invent new history when days pass", () => {
  const provider = new SyntheticBankingProvider();
  const now = Date.parse("2026-10-05T00:00:00Z");
  const first = provider.connect("Up", now);
  const next = provider.sync(
    first.consent,
    first.snapshot.accounts,
    now + 86400000,
  );
  assert.deepEqual(
    next.transactions.map((t) => t.providerId),
    first.snapshot.transactions.map((t) => t.providerId),
  );
});
