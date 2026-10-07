import { z } from "zod";
import { civilDate } from "../shared/finance.js";
export const idSchema = z.uuid();
export const dateSchema = z.string().refine((value) => {
  try {
    civilDate(value);
    return value >= "2000-01-01" && value <= "2100-12-31";
  } catch {
    return false;
  }
}, "Use a valid date between 2000 and 2100");
const cents = z.number().int().min(0).max(100_000_000);
export const credentialsSchema = z.strictObject({
  email: z
    .email()
    .max(254)
    .transform((s) => s.trim().toLowerCase()),
  password: z.string().min(12).max(128),
  device: z.string().trim().min(1).max(80),
});
export const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(1).max(50),
});
export const refreshSchema = z.strictObject({
  refreshToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});
export const commitmentSchema = z.strictObject({
  merchant: z.string().trim().min(1).max(80),
  amount: cents.min(1),
  currency: z.literal("AUD"),
  accountId: idSchema,
  kind: z.enum(["income", "expense"]),
  category: z.enum([
    "Housing",
    "Utilities",
    "Subscription",
    "Insurance",
    "Health",
    "Loan",
    "Salary",
    "Other",
  ]),
  frequency: z.enum([
    "weekly",
    "fortnightly",
    "monthly",
    "quarterly",
    "annually",
  ]),
  nextDate: dateSchema,
  status: z.enum(["active", "paused"]),
  certainty: z.enum(["expected", "confirmed"]),
  notes: z.string().max(500),
});
export const profileSchema = z.strictObject({
  name: z.string().trim().min(1).max(50),
  buffer: cents,
  theme: z.enum(["light", "dark", "system"]),
  reminders: z.boolean(),
  notificationPrivacy: z.enum(["private", "detailed", "hidden"]),
  timeZone: z
    .enum([
      "Australia/Adelaide",
      "Australia/Sydney",
      "Australia/Brisbane",
      "Australia/Perth",
      "Australia/Darwin",
      "Australia/Hobart",
      "Australia/Melbourne",
    ])
    .default("Australia/Adelaide"),
  onboardingCompleted: z.boolean().default(false),
  hideAmounts: z.boolean().default(false),
  calendarView: z.enum(["Week", "Fortnight", "Month"]).default("Month"),
  reducedHome: z.boolean().default(false),
});
export const connectSchema = z.strictObject({
  institution: z.string().max(80),
  acceptedScopes: z
    .array(z.enum(["accounts", "balances", "transactions"]))
    .length(3),
});
export const classificationSchema = z.strictObject({
  category: commitmentSchema.shape.category,
  notes: z.string().max(500),
});
