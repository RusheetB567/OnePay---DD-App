import type { Workspace } from "../../shared/contracts.js";
import {
  addDays,
  calculateForecast,
  recurringPatterns,
} from "../../shared/finance.js";
import type { UserRecord } from "../store.js";
export interface Notification {
  id: string;
  kind:
    | "payment_due"
    | "account_shortfall"
    | "new_pattern"
    | "price_increase"
    | "consent_expiry"
    | "security";
  title: string;
  message: string;
  target: "payments" | "forecast" | "insights" | "accounts" | "security";
}
export function notifications(
  user: UserRecord,
  today: string,
  now: number,
): Notification[] {
  const w = user.workspace,
    results: Notification[] = [];
  const f = calculateForecast(w, today, 30, now);
  if (w.profile.reminders) {
    for (const e of f.events.filter(
      (e) => e.kind === "expense" && e.date <= addDays(today, 3),
    ))
      results.push({
        id: `due:${e.id}:${e.date}`,
        kind: "payment_due",
        title: "Upcoming payment",
        message:
          w.profile.notificationPrivacy === "detailed"
            ? `${e.merchant}: AUD ${(e.amount / 100).toFixed(2)} expected ${e.date}.`
            : `Payment expected ${e.date}.`,
        target: "payments",
      });
    for (const a of f.accounts.filter((a) => a.shortfall > 0))
      results.push({
        id: `shortfall:${a.id}:${today}`,
        kind: "account_shortfall",
        title: "Account funding warning",
        message:
          w.profile.notificationPrivacy === "detailed"
            ? `${a.name} may be short by AUD ${(a.shortfall / 100).toFixed(2)} before income.`
            : "An account may not have enough for its expected payments.",
        target: "forecast",
      });
    const pending = recurringPatterns(w.transactions).filter(
      (p) =>
        !w.ignoredPatterns.includes(p.key) &&
        !w.commitments.some(
          (c) =>
            c.accountId === p.accountId &&
            c.merchant.toLowerCase() === p.merchant.toLowerCase() &&
            c.kind === p.kind,
        ),
    );
    for (const p of pending)
      results.push({
        id: `pattern:${p.key}`,
        kind:
          p.kind === "expense" && p.amount - p.previousAmount >= 100
            ? "price_increase"
            : "new_pattern",
        title:
          p.kind === "expense" && p.amount - p.previousAmount >= 100
            ? "Recurring price increase"
            : "New recurring pattern",
        message:
          w.profile.notificationPrivacy === "detailed"
            ? `${p.merchant} has a ${p.frequency} pattern to review.`
            : "Review a recurring pattern detected in your transactions.",
        target: "insights",
      });
    for (const c of w.consents.filter(
      (c) =>
        c.status === "active" && Date.parse(c.expiresAt) <= now + 7 * 86400000,
    ))
      results.push({
        id: `consent:${c.id}`,
        kind: "consent_expiry",
        title: "Bank consent needs attention",
        message:
          "Your data permissions expire soon or have expired. Review your connection.",
        target: "accounts",
      });
  }
  for (const a of user.audit
    .filter((a) => a.action === "REFRESH_TOKEN_REUSE_BLOCKED")
    .slice(-5))
    results.push({
      id: a.id,
      kind: "security",
      title: "Session security alert",
      message:
        "A reused session credential was blocked. Review your active sessions.",
      target: "security",
    });
  return results
    .slice(0, 100)
    .map((n) =>
      w.profile.notificationPrivacy === "hidden"
        ? {
            ...n,
            title: "OnePay update",
            message: "Open your workspace to review an update.",
          }
        : n,
    );
}
