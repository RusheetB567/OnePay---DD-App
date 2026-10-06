import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceDate,
  calculateForecast,
  calendarEvents,
  civilDate,
  decimalToCents,
  recurringPatterns,
} from "../shared/finance.js";
import { newWorkspace } from "../backend/store.js";
import type { Commitment, Workspace } from "../shared/contracts.js";
const now = Date.parse("2026-10-05T12:00:00Z");
function scenario(): Workspace {
  const w = newWorkspace("Test");
  w.profile.buffer = 5000;
  w.consents.push({
    id: "c",
    institution: "Sample",
    provider: "test",
    scopes: [],
    status: "active",
    grantedAt: "2026-10-01T00:00:00Z",
    expiresAt: "2027-01-01T00:00:00Z",
  });
  w.accounts.push(
    {
      id: "a",
      connectionId: "c",
      providerId: "a",
      name: "Bills",
      institution: "Sample",
      mask: "0001",
      role: "bills",
      balance: 100000,
      currency: "AUD",
      lastSynced: "2026-10-05T00:00:00Z",
    },
    {
      id: "b",
      connectionId: "c",
      providerId: "b",
      name: "Spending",
      institution: "Sample",
      mask: "0002",
      role: "spending",
      balance: 200000,
      currency: "AUD",
      lastSynced: "2026-10-05T00:00:00Z",
    },
    {
      id: "s",
      connectionId: "c",
      providerId: "s",
      name: "Savings",
      institution: "Sample",
      mask: "0003",
      role: "savings",
      balance: 900000,
      currency: "AUD",
      lastSynced: "2026-10-05T00:00:00Z",
    },
  );
  const c: Commitment = {
    id: "rent",
    merchant: "Rent",
    amount: 150000,
    accountId: "a",
    currency: "AUD",
    kind: "expense",
    category: "Housing",
    frequency: "monthly",
    nextDate: "2026-10-06",
    anchorDay: 6,
    status: "active",
    provenance: "manual",
    certainty: "expected",
    confidence: 100,
    notes: "",
  };
  w.commitments.push(c, {
    ...c,
    id: "pay",
    merchant: "Pay",
    amount: 200000,
    kind: "income",
    category: "Salary",
  });
  return w;
}
test("strict decimal input avoids floating-point conversion", () => {
  assert.equal(decimalToCents("10.25"), 1025);
  assert.equal(decimalToCents("0.1"), 10);
  for (const input of ["-1", "1.001", "1e3", "NaN", "Infinity"])
    assert.throws(() => decimalToCents(input));
});
test("invalid civil dates and forecast horizons fail closed", () => {
  assert.throws(() => civilDate("2026-02-30"));
  assert.throws(() => calendarEvents(scenario(), "2026-10-05", 91, now));
  assert.throws(() => calendarEvents(scenario(), "2026-10-05", -1, now));
});
test("UTC recurrence preserves anchors over leap years and DST", () => {
  assert.equal(advanceDate("2026-01-31", "monthly", 31), "2026-02-28");
  assert.equal(advanceDate("2026-02-28", "monthly", 31), "2026-03-31");
  assert.equal(advanceDate("2024-02-29", "annually", 29), "2025-02-28");
  assert.equal(advanceDate("2026-10-03", "weekly", 3), "2026-10-10");
});
test("same-day debit precedes income and reports account shortfall", () => {
  const f = calculateForecast(scenario(), "2026-10-05", 7, now);
  assert.equal(f.opening, 300000);
  assert.equal(f.minimum, 150000);
  assert.equal(f.safeToSpend, 145000);
  assert.equal(f.closing, 350000);
  assert.equal(f.accounts.find((a) => a.id === "a")?.shortfall, 50000);
  assert.equal(f.accounts.length, 2);
  assert.equal(f.calculationVersion, "onepay-forecast-v2");
});
test("consent expiry and tracking pause remove forecast events", () => {
  const w = scenario();
  w.commitments.forEach((c) => {
    c.status = "paused";
  });
  assert.equal(calendarEvents(w, "2026-10-05", 30, now).length, 0);
  w.consents[0]!.expiresAt = "2026-10-01T00:00:00Z";
  assert.equal(calculateForecast(w, "2026-10-05", 30, now).opening, 0);
});
test("variable recurring salary has explicit evidence and estimates", () => {
  const w = scenario();
  for (const [i, date] of ["2026-09-01", "2026-09-15", "2026-09-29"].entries())
    w.transactions.push({
      id: String(i),
      providerId: String(i),
      accountId: "a",
      merchant: "Employer",
      amount: 310000 + i * 1000,
      date,
      category: "Salary",
      status: "posted",
      notes: "",
      description: "",
    });
  const p = recurringPatterns(w.transactions)[0]!;
  assert.equal(p.kind, "income");
  assert.equal(p.frequency, "fortnightly");
  assert.equal(p.evidence.length, 3);
  assert.equal(p.maxAmount, 312000);
});
