import { createHash } from "node:crypto";
import { z } from "zod";
import type {
  Commitment,
  Transaction,
  Workspace,
} from "../../shared/contracts.js";
import { recurringPatterns } from "../../shared/finance.js";
import { dateSchema, idSchema, commitmentSchema } from "../schemas.js";
import { ApiError } from "../errors.js";
export const transactionQuerySchema = z
  .strictObject({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().max(500).optional(),
    search: z.string().max(100).default(""),
    accountId: idSchema.optional(),
    category: commitmentSchema.shape.category.optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    minAmount: z.coerce.number().int().min(0).max(100000000).optional(),
    maxAmount: z.coerce.number().int().min(0).max(100000000).optional(),
    filter: z
      .enum(["All", "Income", "Subscriptions", "Recurring", "Utilities"])
      .default("All"),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, "Invalid date range")
  .refine(
    (q) =>
      q.minAmount === undefined ||
      q.maxAmount === undefined ||
      q.minAmount <= q.maxAmount,
    "Invalid amount range",
  );
export interface TransactionPage {
  items: Transaction[];
  nextCursor: string | null;
}
export function transactionPage(
  w: Workspace,
  query: z.infer<typeof transactionQuerySchema>,
): TransactionPage {
  if (query.accountId && !w.accounts.some((a) => a.id === query.accountId))
    throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Account unavailable.");
  const { cursor, ...filters } = query;
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(filters))
    .digest("hex");
  let after: { date: string; id: string } | null = null;
  if (cursor) {
    try {
      const data = z
        .strictObject({ date: dateSchema, id: idSchema, filter: z.string() })
        .parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
      if (data.filter !== fingerprint) throw new Error("Filter mismatch");
      after = data;
    } catch {
      throw new ApiError(
        400,
        "INVALID_CURSOR",
        "Restart the transaction search.",
      );
    }
  }
  const patterns = recurringPatterns(w.transactions);
  const recurring = new Set(
    [...patterns, ...w.commitments].map(
      (p) => `${p.accountId}:${p.merchant.toLowerCase()}`,
    ),
  );
  const items = w.transactions
    .filter(
      (t) =>
        (!query.accountId || t.accountId === query.accountId) &&
        (!query.category || t.category === query.category) &&
        (!query.from || t.date >= query.from) &&
        (!query.to || t.date <= query.to) &&
        (query.minAmount === undefined ||
          Math.abs(t.amount) >= query.minAmount) &&
        (query.maxAmount === undefined ||
          Math.abs(t.amount) <= query.maxAmount) &&
        `${t.merchant} ${t.description}`
          .toLowerCase()
          .includes(query.search.toLowerCase()) &&
        (query.filter === "All" ||
          (query.filter === "Income" && t.amount > 0) ||
          (query.filter === "Subscriptions" && t.category === "Subscription") ||
          (query.filter === "Utilities" && t.category === "Utilities") ||
          (query.filter === "Recurring" &&
            recurring.has(`${t.accountId}:${t.merchant.toLowerCase()}`))) &&
        (!after ||
          t.date < after.date ||
          (t.date === after.date && t.id < after.id)),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const page = items.slice(0, query.limit);
  const last = page.at(-1);
  return {
    items: page,
    nextCursor:
      items.length > query.limit && last
        ? Buffer.from(
            JSON.stringify({
              date: last.date,
              id: last.id,
              filter: fingerprint,
            }),
          ).toString("base64url")
        : null,
  };
}
export function annualCost(item: Commitment): number {
  const times = {
    weekly: 52,
    fortnightly: 26,
    monthly: 12,
    quarterly: 4,
    annually: 1,
  }[item.frequency];
  return item.amount * times;
}
export function subscriptionSummary(w: Workspace) {
  const items = w.commitments.filter(
    (c) =>
      c.kind === "expense" &&
      c.category === "Subscription" &&
      c.status === "active",
  );
  const annual = items.reduce((sum, c) => sum + annualCost(c), 0);
  return {
    annual,
    monthly: Math.floor((annual + 6) / 12),
    items: items.map((c) => ({ ...c, annual: annualCost(c) })),
    assumptions: [
      "Monthly equivalent rounds half up to AUD cents.",
      "52 weekly or 26 fortnightly occurrences per year are estimates.",
      "Only active commitments classified as subscriptions are included.",
    ],
  };
}
