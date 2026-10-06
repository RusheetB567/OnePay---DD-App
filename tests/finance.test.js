import test from "node:test";
import assert from "node:assert/strict";
import { advance, events, forecast, detectRecurring } from "../src/finance.js";
const state = () => ({
  buffer: 5000,
  accounts: [
    { id: "a", connected: true, role: "spending", balance: 100000 },
    { id: "s", connected: true, role: "savings", balance: 900000 },
  ],
  payments: [
    {
      id: "p",
      merchant: "Rent",
      amount: 60000,
      nextDate: "2026-10-06",
      frequency: "monthly",
      status: "active",
      accountId: "a",
      kind: "expense",
    },
  ],
  income: [
    {
      id: "i",
      merchant: "Salary",
      amount: 80000,
      nextDate: "2026-10-10",
      frequency: "monthly",
      status: "active",
      accountId: "a",
      kind: "income",
    },
  ],
});
test("forecast reserves cash before payday and excludes savings", () => {
  const f = forecast(state(), "2026-10-05");
  assert.equal(f.balance, 100000);
  assert.equal(f.minimum, 40000);
  assert.equal(f.safe, 35000);
  assert.equal(f.final, 120000);
});
test("paused and disconnected obligations are excluded", () => {
  const s = state();
  s.payments[0].status = "paused";
  assert.equal(events(s, "2026-10-05").length, 1);
  s.accounts[0].connected = false;
  assert.equal(events(s, "2026-10-05").length, 0);
  assert.equal(forecast(s, "2026-10-05").balance, 0);
});
test("monthly recurrence clamps month ends without drifting", () => {
  assert.equal(advance("2026-01-31", "monthly", 31), "2026-02-28");
  assert.equal(advance("2026-02-28", "monthly", 31), "2026-03-31");
  assert.equal(advance("2024-02-29", "annually", 29), "2025-02-28");
});
test("weekly recurrence crosses year boundaries", () =>
  assert.equal(advance("2026-12-28", "weekly"), "2027-01-04"));
test("negative forecast gives zero safe to spend", () => {
  const s = state();
  s.payments[0].amount = 150000;
  assert.equal(forecast(s, "2026-10-05").safe, 0);
  assert.equal(forecast(s, "2026-10-05").minimum, -50000);
});
test("detection requires history and separates bank accounts", () => {
  const tx = ["2026-07-08", "2026-08-08", "2026-09-08"].map((date, i) => ({
    id: String(i),
    date,
    merchant: "Adobe",
    amount: i === 2 ? -3299 : -2999,
    accountId: "a",
  }));
  const detected = detectRecurring(tx);
  assert.equal(detected.length, 1);
  assert.equal(detected[0].nextDate, "2026-10-08");
  assert.equal(detected[0].previousAmount, 2999);
  assert.equal(detected[0].amount, 3299);
  assert.equal(detectRecurring(tx.slice(0, 2)).length, 0);
  tx[2].accountId = "b";
  assert.equal(detectRecurring(tx).length, 0);
});
test("income is detected independently from expenses", () => {
  const tx = ["2026-09-01", "2026-09-15", "2026-09-29"].map((date, i) => ({
    id: String(i),
    date,
    merchant: "Employer",
    amount: 310000,
    accountId: "a",
  }));
  assert.equal(detectRecurring(tx)[0].kind, "income");
  assert.equal(detectRecurring(tx)[0].frequency, "fortnightly");
});
