export type Frequency =
  "weekly" | "fortnightly" | "monthly" | "quarterly" | "annually";
export type Category =
  | "Housing"
  | "Utilities"
  | "Subscription"
  | "Insurance"
  | "Health"
  | "Loan"
  | "Salary"
  | "Other";
export interface Account {
  id: string;
  connectionId: string;
  providerId: string;
  name: string;
  institution: string;
  mask: string;
  role: "spending" | "bills" | "savings";
  balance: number;
  currency: "AUD";
  lastSynced: string;
}
export interface Consent {
  id: string;
  institution: string;
  provider: string;
  status: "active" | "revoked" | "expired";
  scopes: string[];
  grantedAt: string;
  expiresAt: string;
  revokedAt?: string;
}
export interface Transaction {
  id: string;
  providerId: string;
  accountId: string;
  merchant: string;
  amount: number;
  date: string;
  category: Category;
  description: string;
  status: "posted" | "pending";
  notes: string;
}
export interface Commitment {
  id: string;
  merchant: string;
  amount: number;
  currency: "AUD";
  accountId: string;
  kind: "income" | "expense";
  category: Category;
  frequency: Frequency;
  nextDate: string;
  anchorDay: number;
  status: "active" | "paused";
  provenance: "manual" | "detected";
  certainty: "expected" | "confirmed" | "predicted";
  confidence: number;
  notes: string;
}
export interface Profile {
  name: string;
  buffer: number;
  theme: "light" | "dark" | "system";
  reminders: boolean;
  notificationPrivacy: "private" | "detailed" | "hidden";
  timeZone: string;
  onboardingCompleted: boolean;
  hideAmounts?: boolean;
  calendarView?: "Week" | "Fortnight" | "Month";
  reducedHome?: boolean;
}
export interface Workspace {
  profile: Profile;
  accounts: Account[];
  consents: Consent[];
  transactions: Transaction[];
  commitments: Commitment[];
  ignoredPatterns: string[];
  revision: number;
}
export interface FinancialEvent extends Commitment {
  date: string;
  signedAmount: number;
}
export interface ForecastPoint {
  date: string;
  balance: number;
  beforeIncome: number;
  income: number;
  expense: number;
}
export interface Forecast {
  calculationVersion: string;
  calculationDate: string;
  days: number;
  opening: number;
  committed: number;
  income: number;
  closing: number;
  minimum: number;
  safeToSpend: number;
  buffer: number;
  points: ForecastPoint[];
  events: FinancialEvent[];
  accounts: {
    id: string;
    name: string;
    minimum: number;
    closing: number;
    shortfall: number;
  }[];
  assumptions: string[];
}
export interface Pattern {
  category: Category;
  key: string;
  merchant: string;
  accountId: string;
  amount: number;
  previousAmount: number;
  minAmount: number;
  maxAmount: number;
  kind: "income" | "expense";
  frequency: Frequency;
  nextDate: string;
  confidence: number;
  evidence: { date: string; amount: number }[];
}
export interface AuditEvent {
  id: string;
  userId: string;
  action: string;
  at: string;
  requestId: string;
  previousHash: string;
  hash: string;
}
export interface SessionInfo {
  id: string;
  device: string;
  createdAt: number;
  lastSeen: number;
  expiresAt: number;
  current: boolean;
}
export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
export interface Bootstrap {
  mode: "development" | "production";
  profile: Profile;
  accounts: Account[];
  consents: Consent[];
  commitments: Commitment[];
  transactions: Transaction[];
  revision: number;
  patterns: Pattern[];
  forecast: Forecast;
  updatedAt: string;
  capabilities: {
    banking: "synthetic" | "unavailable";
    payments: false;
    recovery: false;
    passkeys: boolean;
  };
}
