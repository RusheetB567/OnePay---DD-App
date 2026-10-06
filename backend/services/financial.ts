import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { Workspace, Commitment } from "../../shared/contracts.js";
import { civilDate, recurringPatterns } from "../../shared/finance.js";
import { ApiError } from "../errors.js";
import type { classificationSchema, commitmentSchema } from "../schemas.js";
type CommitmentInput = z.infer<typeof commitmentSchema>;
export class FinancialService {
  create(w: Workspace, input: CommitmentInput): Commitment {
    this.ownedAccount(w, input.accountId);
    if (w.commitments.length >= 500)
      throw new ApiError(409, "LIMIT_REACHED", "Commitment limit reached.");
    const result: Commitment = {
      ...input,
      id: randomUUID(),
      anchorDay: civilDate(input.nextDate).getUTCDate(),
      provenance: "manual",
      confidence: 100,
    };
    w.commitments.push(result);
    return result;
  }
  update(w: Workspace, id: string, input: CommitmentInput) {
    const old = w.commitments.find((c) => c.id === id);
    if (!old)
      throw new ApiError(
        404,
        "COMMITMENT_NOT_FOUND",
        "Commitment unavailable.",
      );
    this.ownedAccount(w, input.accountId);
    Object.assign(old, input, {
      anchorDay: civilDate(input.nextDate).getUTCDate(),
      provenance: "manual",
      confidence: 100,
    });
    return old;
  }
  remove(w: Workspace, id: string) {
    if (!w.commitments.some((c) => c.id === id))
      throw new ApiError(
        404,
        "COMMITMENT_NOT_FOUND",
        "Commitment unavailable.",
      );
    w.commitments = w.commitments.filter((c) => c.id !== id);
  }
  review(w: Workspace, key: string, decision: "confirm" | "ignore") {
    const pattern = recurringPatterns(w.transactions).find(
      (p) => p.key === key,
    );
    if (!pattern)
      throw new ApiError(404, "PATTERN_NOT_FOUND", "Pattern unavailable.");
    if (
      w.ignoredPatterns.includes(key) ||
      w.commitments.some(
        (c) =>
          c.accountId === pattern.accountId &&
          c.merchant.toLowerCase() === pattern.merchant.toLowerCase() &&
          c.kind === pattern.kind,
      )
    )
      throw new ApiError(
        409,
        "ALREADY_REVIEWED",
        "This pattern was already reviewed.",
      );
    if (decision === "ignore") {
      w.ignoredPatterns.push(key);
      return;
    }
    if (w.commitments.length >= 500)
      throw new ApiError(409, "LIMIT_REACHED", "Commitment limit reached.");
    w.commitments.push({
      id: randomUUID(),
      merchant: pattern.merchant,
      accountId: pattern.accountId,
      amount: pattern.amount,
      currency: "AUD",
      kind: pattern.kind,
      category: pattern.kind === "income" ? "Salary" : pattern.category,
      frequency: pattern.frequency,
      nextDate: pattern.nextDate,
      anchorDay: civilDate(pattern.nextDate).getUTCDate(),
      status: "active",
      provenance: "detected",
      certainty: "predicted",
      confidence: pattern.confidence,
      notes: "",
    });
  }
  classify(
    w: Workspace,
    id: string,
    input: z.infer<typeof classificationSchema>,
  ) {
    const tx = w.transactions.find((t) => t.id === id);
    if (!tx)
      throw new ApiError(
        404,
        "TRANSACTION_NOT_FOUND",
        "Transaction unavailable.",
      );
    Object.assign(tx, input);
  }
  private ownedAccount(w: Workspace, id: string) {
    if (!w.accounts.some((a) => a.id === id))
      throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Account unavailable.");
  }
}
