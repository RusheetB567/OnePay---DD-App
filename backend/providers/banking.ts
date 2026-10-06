import { randomUUID } from "node:crypto";
import { addDays, civilDate } from "../../shared/finance.js";
import type { Account, Consent, Transaction } from "../../shared/contracts.js";
export interface BankingSnapshot {
  accounts: Account[];
  transactions: Transaction[];
}
export interface BankingProvider {
  readonly kind: "synthetic" | "unavailable";
  institutions(): string[];
  connect(
    institution: string,
    now: number,
  ): { consent: Consent; snapshot: BankingSnapshot };
  sync(consent: Consent, accounts: Account[], now: number): BankingSnapshot;
}
export class UnavailableBankingProvider implements BankingProvider {
  readonly kind = "unavailable" as const;
  institutions() {
    return [];
  }
  connect(): never {
    throw new Error("A reviewed banking provider is not configured");
  }
  sync(): never {
    throw new Error("A reviewed banking provider is not configured");
  }
}
export class SyntheticBankingProvider implements BankingProvider {
  readonly kind = "synthetic" as const;
  institutions() {
    return ["Up", "ING", "ANZ", "NAB", "Westpac", "Commonwealth Bank"];
  }
  connect(institution: string, now: number) {
    const id = randomUUID();
    const consent: Consent = {
      id,
      institution,
      provider: "synthetic-development",
      status: "active",
      scopes: ["accounts", "balances", "transactions"],
      grantedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 90 * 86400000).toISOString(),
    };
    const accounts: Account[] = [
      {
        id: randomUUID(),
        connectionId: id,
        providerId: `${id}-everyday`,
        name: "Everyday",
        institution,
        mask: "7821",
        role: "spending",
        balance: 263000,
        currency: "AUD",
        lastSynced: new Date(now).toISOString(),
      },
      {
        id: randomUUID(),
        connectionId: id,
        providerId: `${id}-bills`,
        name: "Bills",
        institution,
        mask: "4098",
        role: "bills",
        balance: 125000,
        currency: "AUD",
        lastSynced: new Date(now).toISOString(),
      },
      {
        id: randomUUID(),
        connectionId: id,
        providerId: `${id}-savings`,
        name: "Rainy day",
        institution,
        mask: "6120",
        role: "savings",
        balance: 840000,
        currency: "AUD",
        lastSynced: new Date(now).toISOString(),
      },
    ];
    return { consent, snapshot: this.sync(consent, accounts, now) };
  }
  sync(consent: Consent, accounts: Account[], now: number): BankingSnapshot {
    if (consent.status !== "active" || Date.parse(consent.expiresAt) <= now)
      throw new Error("Consent inactive");
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Australia/Adelaide",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(Date.parse(consent.grantedAt));
    const payday = addDays(today, -7);
    const tx: Transaction[] = [];
    const everyday = accounts.find((a) => a.role === "spending")!;
    for (let i = 0; i < 4; i++) {
      const date = addDays(payday, -14 * i);
      tx.push({
        id: randomUUID(),
        providerId: `salary-${date}`,
        accountId: everyday.id,
        merchant: "Acme salary",
        amount: 310000,
        date,
        category: "Salary",
        description: "Synthetic fortnightly salary",
        status: "posted",
        notes: "",
      });
    }
    const monthDate = civilDate(today);
    monthDate.setUTCDate(8);
    if (monthDate.toISOString().slice(0, 10) > today)
      monthDate.setUTCMonth(monthDate.getUTCMonth() - 1);
    const month = monthDate.toISOString().slice(0, 10);
    // Explicitly synthetic monthly history with stable provider IDs for repeatable imports.
    for (let i = 0; i < 4; i++) {
      const d = civilDate(month);
      d.setUTCDate(8);
      d.setUTCMonth(d.getUTCMonth() - i);
      const date = d.toISOString().slice(0, 10);
      if (date > today) continue;
      for (const [merchant, amount, category] of [
        ["Netflix", 2599, "Subscription"],
        ["Adobe", i === 0 ? 3299 : 2999, "Subscription"],
        ["Telstra", 8900, "Utilities"],
      ] as const)
        tx.push({
          id: randomUUID(),
          providerId: `${merchant}-${date}`,
          accountId: everyday.id,
          merchant,
          amount: -amount,
          date,
          category,
          description: "Synthetic monthly debit",
          status: "posted",
          notes: "",
        });
    }
    return {
      accounts: accounts.map((a) => ({
        ...a,
        lastSynced: new Date(now).toISOString(),
      })),
      transactions: tx,
    };
  }
}
