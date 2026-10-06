import type {
  Commitment,
  FinancialEvent,
  Forecast,
  Frequency,
  Pattern,
  Transaction,
  Workspace,
} from "./contracts.js";
const dayMs = 86_400_000;
export const dateKey = (date: Date): string => date.toISOString().slice(0, 10);
export function civilDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid civil date");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || dateKey(date) !== value)
    throw new Error("Invalid civil date");
  return date;
}
export function addDays(value: string, days: number): string {
  return dateKey(new Date(civilDate(value).getTime() + days * dayMs));
}
export function advanceDate(
  value: string,
  frequency: Frequency,
  anchorDay: number,
): string {
  const daily = { weekly: 7, fortnightly: 14 }[
    frequency as "weekly" | "fortnightly"
  ];
  if (daily) return addDays(value, daily);
  const months = { monthly: 1, quarterly: 3, annually: 12 }[
    frequency as "monthly" | "quarterly" | "annually"
  ];
  if (!months) throw new Error("Invalid frequency");
  const date = civilDate(value);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(anchorDay, end));
  return dateKey(date);
}
export function connectedAccounts(workspace: Workspace, now: number) {
  return workspace.accounts.filter((a) =>
    workspace.consents.some(
      (c) =>
        c.id === a.connectionId &&
        c.status === "active" &&
        Date.parse(c.expiresAt) > now,
    ),
  );
}
export function calendarEvents(
  workspace: Workspace,
  start: string,
  days: number,
  now: number,
): FinancialEvent[] {
  civilDate(start);
  if (!Number.isInteger(days) || days < 0 || days > 90)
    throw new Error("Invalid horizon");
  const end = addDays(start, days);
  const available = new Set(connectedAccounts(workspace, now).map((a) => a.id));
  return workspace.commitments
    .flatMap((item) => {
      if (item.status !== "active" || !available.has(item.accountId)) return [];
      const result: FinancialEvent[] = [];
      let date = item.nextDate;
      for (let count = 0; date <= end; count++) {
        if (count > 20000)
          throw new Error("Recurrence outside supported range");
        if (date >= start)
          result.push({
            ...item,
            date,
            signedAmount: item.kind === "income" ? item.amount : -item.amount,
          });
        date = advanceDate(date, item.frequency, item.anchorDay);
      }
      return result;
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.signedAmount - b.signedAmount ||
        a.id.localeCompare(b.id),
    );
}
function sum(values: number[]): number {
  const total = values.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(total)) throw new Error("Amount overflow");
  return total;
}
function projection(
  opening: number,
  items: FinancialEvent[],
  start: string,
  days: number,
) {
  let balance = opening,
    minimum = opening;
  const points = [];
  for (let day = 0; day <= days; day++) {
    const date = addDays(start, day);
    const onDate = items.filter((e) => e.date === date);
    const expense = sum(
      onDate.filter((e) => e.signedAmount < 0).map((e) => -e.signedAmount),
    );
    const income = sum(
      onDate.filter((e) => e.signedAmount > 0).map((e) => e.signedAmount),
    );
    const beforeIncome = sum([balance, -expense]);
    balance = sum([beforeIncome, income]);
    minimum = Math.min(minimum, beforeIncome, balance);
    points.push({ date, balance, beforeIncome, income, expense });
  }
  return { points, minimum, closing: balance };
}
export function calculateForecast(
  workspace: Workspace,
  start: string,
  days: number,
  now: number,
): Forecast {
  const eligible = connectedAccounts(workspace, now).filter(
    (a) => a.role !== "savings",
  );
  const ids = new Set(eligible.map((a) => a.id));
  const events = calendarEvents(workspace, start, days, now).filter((e) =>
    ids.has(e.accountId),
  );
  const opening = sum(eligible.map((a) => a.balance));
  const projected = projection(opening, events, start, days);
  return {
    calculationVersion: "onepay-forecast-v2",
    calculationDate: start,
    days,
    opening,
    committed: sum(
      events.filter((e) => e.signedAmount < 0).map((e) => -e.signedAmount),
    ),
    income: sum(
      events.filter((e) => e.signedAmount > 0).map((e) => e.signedAmount),
    ),
    ...projected,
    safeToSpend: Math.max(
      0,
      sum([projected.minimum, -workspace.profile.buffer]),
    ),
    buffer: workspace.profile.buffer,
    events,
    accounts: eligible.map((a) => {
      const p = projection(
        a.balance,
        events.filter((e) => e.accountId === a.id),
        start,
        days,
      );
      return {
        id: a.id,
        name: a.name,
        minimum: p.minimum,
        closing: p.closing,
        shortfall: Math.max(0, -p.minimum),
      };
    }),
    assumptions: [
      "AUD integer cents; no currency conversion.",
      "Connected spending and bills accounts only; savings excluded.",
      "Payments occur before expected income on the same day for conservative estimates.",
      "Expected income and bills are included at their tracked amounts; no confidence weighting is applied.",
      "Everyday spending, untracked bills and transfers are excluded.",
      "Positive combined cash flow does not guarantee each account can fund its payments.",
      "Expired or revoked consent is excluded.",
    ],
  };
}
export function recurringPatterns(transactions: Transaction[]): Pattern[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (t.status !== "posted" || t.amount === 0) continue;
    const key = `${t.accountId}:${t.merchant.trim().toLowerCase()}:${t.amount > 0 ? "income" : "expense"}`;
    groups.set(key, [...(groups.get(key) || []), t]);
  }
  return [...groups.entries()].flatMap(([key, group]) => {
    const ordered = group.sort((a, b) => a.date.localeCompare(b.date));
    if (ordered.length < 3) return [];
    const gaps = ordered
      .slice(1)
      .map(
        (t, i) =>
          (civilDate(t.date).getTime() -
            civilDate(ordered[i]!.date).getTime()) /
          dayMs,
      );
    const average = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const cadence: Frequency | undefined =
      average >= 6 && average <= 8
        ? "weekly"
        : average >= 13 && average <= 15
          ? "fortnightly"
          : average >= 27 && average <= 32
            ? "monthly"
            : average >= 85 && average <= 95
              ? "quarterly"
              : average >= 360 && average <= 370
                ? "annually"
                : undefined;
    if (
      !cadence ||
      gaps.some((g) => Math.abs(g - average) > (cadence === "annually" ? 7 : 4))
    )
      return [];
    const latest = ordered.at(-1)!;
    const amounts = ordered.map((t) => Math.abs(t.amount));
    return [
      {
        key,
        category: latest.category,
        merchant: latest.merchant,
        accountId: latest.accountId,
        amount: Math.abs(latest.amount),
        previousAmount: Math.abs(ordered.at(-2)!.amount),
        minAmount: Math.min(...amounts),
        maxAmount: Math.max(...amounts),
        kind: latest.amount > 0 ? ("income" as const) : ("expense" as const),
        frequency: cadence,
        nextDate: advanceDate(
          latest.date,
          cadence,
          civilDate(latest.date).getUTCDate(),
        ),
        confidence: gaps.length >= 3 ? 95 : 85,
        evidence: ordered.map((t) => ({ date: t.date, amount: t.amount })),
      },
    ];
  });
}
export function decimalToCents(value: string): number {
  const match = /^(0|[1-9]\d{0,6})(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match)
    throw new Error("Enter a valid AUD amount with at most two decimal places");
  const result =
    Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  if (!Number.isSafeInteger(result)) throw new Error("Invalid amount");
  return result;
}

export type CalendarMode = "Day" | "Week" | "Fortnight" | "Month";
export function calendarPeriod(date: string, mode: CalendarMode) {
  const d = civilDate(date);
  if (mode === "Month") {
    d.setUTCDate(1);
    const start = dateKey(d);
    const days = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
    ).getUTCDate();
    return { start, days: days - 1 };
  }
  return { start: date, days: { Day: 0, Week: 6, Fortnight: 13 }[mode] };
}
export function movePeriod(
  date: string,
  mode: CalendarMode,
  direction: 1 | -1,
) {
  const period = calendarPeriod(date, mode);
  if (mode === "Month") {
    const d = civilDate(period.start);
    d.setUTCMonth(d.getUTCMonth() + direction);
    return dateKey(d);
  }
  return addDays(period.start, direction * (period.days + 1));
}
export function monthCells(date: string): (string | null)[] {
  const p = calendarPeriod(date, "Month");
  const weekday = (civilDate(p.start).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array(weekday).fill(null);
  for (let i = 0; i <= p.days; i++) cells.push(addDays(p.start, i));
  while (cells.length % 7) cells.push(null);
  return cells;
}
