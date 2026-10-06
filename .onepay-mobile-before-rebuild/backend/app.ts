import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type {
  Bootstrap,
  Commitment,
  FinancialEvent,
} from "../shared/contracts.js";
import {
  calendarEvents,
  calculateForecast,
  civilDate,
  connectedAccounts,
  recurringPatterns,
} from "../shared/finance.js";
import { AuthService } from "./auth.js";
import { ApiError } from "./errors.js";
import { audit, newWorkspace, type Store, type UserRecord } from "./store.js";
import type { BankingProvider } from "./providers/banking.js";
import type { IdentityProvider } from "./providers/identity.js";
import {
  classificationSchema,
  commitmentSchema,
  connectSchema,
  credentialsSchema,
  dateSchema,
  idSchema,
  profileSchema,
  refreshSchema,
  registerSchema,
} from "./schemas.js";
import { FinancialService } from "./services/financial.js";
import {
  transactionPage,
  transactionQuerySchema,
  subscriptionSummary,
} from "./services/queries.js";
import { notifications } from "./services/notifications.js";
import { NoopObserver, type Observer } from "./observability.js";
interface Context {
  requestId: string;
  userId: string;
  sessionId: string;
}
export interface AppOptions {
  store: Store;
  banking: BankingProvider;
  mode: "development" | "production";
  origins: string[];
  now?: () => number;
  identity?: IdentityProvider;
  authLimit?: number;
  observer?: Observer;
}
export function createApp(options: AppOptions) {
  const app = express();
  const financial = new FinancialService();
  const observer = options.observer || new NoopObserver();
  app.disable("x-powered-by");
  const now = options.now || Date.now;
  const auth = new AuthService(options.store, now);
  const ctx = (res: Response) => res.locals.context as Context;
  const limits = new Map<string, { count: number; until: number }>();
  const rate = (req: Request, bucket: string, max: number) => {
    const at = now();
    if (limits.size > 10000)
      for (const [key, item] of limits)
        if (item.until <= at) limits.delete(key);
    const key = `${bucket}:${req.socket.remoteAddress}`;
    const item = limits.get(key);
    if (item && item.until > at) {
      if (item.count >= max)
        throw new ApiError(
          429,
          "RATE_LIMITED",
          "Too many requests. Please try again later.",
        );
      item.count++;
    } else limits.set(key, { count: 1, until: at + 60000 });
  };
  app.use((req, res, next) => {
    res.locals.context = { requestId: randomUUID() };
    const started = performance.now();
    res.on("finish", () =>
      observer.record({
        event: res.statusCode >= 500 ? "request_failed" : "request_completed",
        requestId: ctx(res).requestId,
        route: req.route?.path || "unmatched",
        method: req.method,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - started),
      }),
    );
    res.set({
      "X-Request-ID": ctx(res).requestId,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    });
    const origin = req.headers.origin;
    if (origin && !options.origins.includes(origin)) {
      next(
        new ApiError(403, "ORIGIN_DENIED", "Request origin is not permitted."),
      );
      return;
    }
    if (origin) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Vary", "Origin");
      res.set(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type, If-Match",
      );
      res.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, DELETE, OPTIONS",
      );
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    try {
      rate(
        req,
        req.path.startsWith("/api/v1/auth") ? "auth" : "api",
        req.path.startsWith("/api/v1/auth") ? options.authLimit || 20 : 180,
      );
      next();
    } catch (e) {
      next(e);
    }
  });
  app.use(express.json({ limit: "32kb", strict: true }));
  app.get("/ready", async (_req, res) => {
    try {
      const ready = await options.store.health();
      res.status(ready ? 200 : 503).json({ ready });
    } catch {
      res.status(503).json({ ready: false });
    }
  });
  app.get("/health", (_req, res) =>
    res.json({ status: "ok", mode: options.mode }),
  );
  app.get("/api/v1/config", (_req, res) =>
    res.json({
      mode: options.mode,
      identity:
        options.mode === "development"
          ? "local-development"
          : options.identity
            ? "oidc"
            : "unavailable",
      banking: options.banking.kind,
      payments: false,
      minimumVersion: "0.2.0",
      recommendedVersion: "0.2.0",
    }),
  );
  app.post("/api/v1/auth/register", async (req, res) => {
    if (options.mode !== "development")
      throw new ApiError(
        503,
        "IDENTITY_PROVIDER_REQUIRED",
        "Use the configured identity provider.",
      );
    res
      .status(201)
      .json(
        await auth.register(registerSchema.parse(req.body), ctx(res).requestId),
      );
  });
  app.post("/api/v1/auth/login", async (req, res) => {
    if (options.mode !== "development")
      throw new ApiError(
        503,
        "IDENTITY_PROVIDER_REQUIRED",
        "Use the configured identity provider.",
      );
    res.json(
      await auth.login(credentialsSchema.parse(req.body), ctx(res).requestId),
    );
  });
  app.post("/api/v1/auth/exchange", async (req, res) => {
    if (!options.identity)
      throw new ApiError(
        503,
        "IDENTITY_PROVIDER_REQUIRED",
        "An identity provider is not configured.",
      );
    const input = z
      .strictObject({
        token: z.string().min(1).max(10000),
        device: z.string().min(1).max(80),
      })
      .parse(req.body);
    let principal;
    try {
      principal = await options.identity.verify(input.token);
    } catch {
      throw new ApiError(
        401,
        "INVALID_IDENTITY",
        "Unable to verify your identity.",
      );
    }
    if (
      principal.authenticatedAt > now() + 30000 ||
      principal.authenticatedAt < now() - 300000
    )
      throw new ApiError(
        401,
        "RECENT_LOGIN_REQUIRED",
        "Please sign in with your provider again.",
      );
    let user = await options.store.findExternal(principal.subject);
    if (!user) {
      const existing = await options.store.findEmail(principal.email);
      if (existing)
        throw new ApiError(
          409,
          "ACCOUNT_LINK_REQUIRED",
          "Contact support to review account linking.",
        );
      user = {
        id: randomUUID(),
        email: principal.email,
        passwordHash: null,
        externalSubject: principal.subject,
        workspace: newWorkspace("Your workspace"),
        sessions: [],
        audit: [],
      };
      await options.store.create(user);
    }
    res.json(
      await auth.issue(
        user.id,
        input.device,
        ctx(res).requestId,
        "OIDC_LOGIN_SUCCEEDED",
        principal.authenticatedAt,
      ),
    );
  });
  app.post("/api/v1/auth/refresh", async (req, res) =>
    res.json(
      await auth.refresh(
        refreshSchema.parse(req.body).refreshToken,
        ctx(res).requestId,
      ),
    ),
  );
  app.use("/api/v1", async (req, res, next) => {
    const bearer = req.headers.authorization?.match(
      /^Bearer ([A-Za-z0-9_-]+)$/,
    )?.[1];
    if (!bearer)
      throw new ApiError(
        401,
        "SESSION_REQUIRED",
        "Please sign in to continue.",
      );
    Object.assign(ctx(res), await auth.authenticate(bearer));
    next();
  });
  async function read(res: Response) {
    const user = await options.store.get(ctx(res).userId);
    if (!user)
      throw new ApiError(401, "SESSION_REQUIRED", "Please sign in again.");
    auth.requireSession(user, ctx(res).sessionId);
    return user;
  }
  async function change<T>(
    req: Request,
    res: Response,
    action: string,
    operation: (u: UserRecord) => T,
    recent = false,
  ): Promise<T> {
    const c = ctx(res);
    return options.store.mutate(c.userId, (u) => {
      auth.requireSession(u, c.sessionId);
      if (recent) auth.requireRecent(u, c.sessionId);
      if (req.headers["if-match"] !== String(u.workspace.revision))
        throw new ApiError(
          409,
          "STALE_REVISION",
          "Your information changed. Refresh and try again.",
        );
      const result = operation(u);
      u.workspace.revision++;
      audit(u, action, c.requestId, new Date(now()).toISOString());
      return result;
    });
  }
  const today = () =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Australia/Adelaide",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now());
  app.get("/api/v1/bootstrap", async (_req, res) => {
    const u = await read(res);
    const w = u.workspace;
    const data: Bootstrap = {
      mode: options.mode,
      ...w,
      transactions: w.transactions
        .slice()
        .sort(
          (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
        )
        .slice(0, 100),
      patterns: recurringPatterns(w.transactions).filter(
        (p) =>
          !w.ignoredPatterns.includes(p.key) &&
          !w.commitments.some(
            (c) =>
              c.accountId === p.accountId &&
              c.merchant.toLowerCase() === p.merchant.toLowerCase() &&
              c.kind === p.kind,
          ),
      ),
      forecast: calculateForecast(w, today(), 30, now()),
      updatedAt: new Date(now()).toISOString(),
      capabilities: {
        banking: options.banking.kind,
        payments: false,
        recovery: false,
        passkeys: false,
      },
    };
    res.json(data);
  });
  app.get("/api/v1/forecast", async (req, res) => {
    const u = await read(res);
    const days = z.coerce
      .number()
      .int()
      .min(1)
      .max(90)
      .parse(req.query.days ?? 30);
    res.json(calculateForecast(u.workspace, today(), days, now()));
  });
  app.get("/api/v1/calendar", async (req, res) => {
    const u = await read(res);
    const start = dateSchema.parse(req.query.start ?? today());
    const days = z.coerce
      .number()
      .int()
      .min(0)
      .max(90)
      .parse(req.query.days ?? 30);
    res.json({ events: calendarEvents(u.workspace, start, days, now()) });
  });
  app.patch("/api/v1/profile", async (req, res) => {
    const input = profileSchema.parse(req.body);
    await change(req, res, "PROFILE_UPDATED", (u) => {
      u.workspace.profile = input;
    });
    res.sendStatus(204);
  });
  app.post("/api/v1/commitments", async (req, res) => {
    const input = commitmentSchema.parse(req.body);
    const result = await change(req, res, "COMMITMENT_CREATED", (u) =>
      financial.create(u.workspace, input),
    );
    res.status(201).json(result);
  });
  app.patch("/api/v1/commitments/:id", async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const input = commitmentSchema.parse(req.body);
    const result = await change(req, res, "COMMITMENT_UPDATED", (u) =>
      financial.update(u.workspace, id, input),
    );
    res.json(result);
  });
  app.delete("/api/v1/commitments/:id", async (req, res) => {
    const id = idSchema.parse(req.params.id);
    await change(req, res, "COMMITMENT_TRACKING_REMOVED", (u) =>
      financial.remove(u.workspace, id),
    );
    res.sendStatus(204);
  });
  app.post("/api/v1/patterns/review", async (req, res) => {
    const input = z
      .strictObject({
        key: z.string().max(200),
        decision: z.enum(["confirm", "ignore"]),
      })
      .parse(req.body);
    await change(req, res, "PATTERN_REVIEWED", (u) =>
      financial.review(u.workspace, input.key, input.decision),
    );
    res.sendStatus(204);
  });
  app.get("/api/v1/transactions", async (req, res) => {
    const u = await read(res);
    res.json(
      transactionPage(u.workspace, transactionQuerySchema.parse(req.query)),
    );
  });
  app.get("/api/v1/transactions/:id", async (req, res) => {
    const u = await read(res);
    const id = idSchema.parse(req.params.id);
    const item = u.workspace.transactions.find((t) => t.id === id);
    if (!item)
      throw new ApiError(
        404,
        "TRANSACTION_NOT_FOUND",
        "Transaction unavailable.",
      );
    res.json(item);
  });
  app.get("/api/v1/notifications", async (_req, res) => {
    const u = await read(res);
    res.json({ items: notifications(u, today(), now()) });
  });
  app.get("/api/v1/subscriptions", async (_req, res) => {
    const u = await read(res);
    res.json(subscriptionSummary(u.workspace));
  });
  app.patch("/api/v1/transactions/:id", async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const input = classificationSchema.parse(req.body);
    await change(req, res, "TRANSACTION_CLASSIFIED", (u) =>
      financial.classify(u.workspace, id, input),
    );
    res.sendStatus(204);
  });
  app.get("/api/v1/institutions", (_req, res) =>
    res.json({
      institutions: options.banking.institutions(),
      kind: options.banking.kind,
    }),
  );
  app.post("/api/v1/connections", async (req, res) => {
    if (options.banking.kind === "unavailable")
      throw new ApiError(
        503,
        "BANKING_UNAVAILABLE",
        "A banking provider is not configured.",
      );
    const input = connectSchema.parse(req.body);
    if (
      !options.banking.institutions().includes(input.institution) ||
      new Set(input.acceptedScopes).size !== 3
    )
      throw new ApiError(
        400,
        "INVALID_CONSENT",
        "Review the institution and data permissions.",
      );
    const result = await change(
      req,
      res,
      "SYNTHETIC_CONSENT_GRANTED",
      (u) => {
        if (u.workspace.consents.length >= 20)
          throw new ApiError(409, "LIMIT_REACHED", "Connection limit reached.");
        const result = options.banking.connect(input.institution, now());
        u.workspace.consents.push(result.consent);
        u.workspace.accounts.push(...result.snapshot.accounts);
        u.workspace.transactions.push(...result.snapshot.transactions);
        return result.consent;
      },
      true,
    );
    res.status(201).json(result);
  });
  app.post("/api/v1/connections/:id/sync", async (req, res) => {
    const id = idSchema.parse(req.params.id);
    if (options.banking.kind === "unavailable")
      throw new ApiError(
        503,
        "BANKING_UNAVAILABLE",
        "A banking provider is not configured.",
      );
    await change(req, res, "SYNTHETIC_BANK_SYNCED", (u) => {
      const c = u.workspace.consents.find((c) => c.id === id);
      if (!c || c.status !== "active" || Date.parse(c.expiresAt) <= now())
        throw new ApiError(
          409,
          "CONSENT_INACTIVE",
          "Renew your bank connection before syncing.",
        );
      const snapshot = options.banking.sync(
        c,
        u.workspace.accounts.filter((a) => a.connectionId === id),
        now(),
      );
      for (const a of snapshot.accounts) {
        const own = u.workspace.accounts.find((old) => old.id === a.id);
        if (own) Object.assign(own, a);
      }
      for (const tx of snapshot.transactions) {
        const existing = u.workspace.transactions.find(
          (t) => t.accountId === tx.accountId && t.providerId === tx.providerId,
        );
        if (!existing) u.workspace.transactions.push(tx);
        else
          Object.assign(existing, {
            amount: tx.amount,
            date: tx.date,
            status: tx.status,
          });
      }
    });
    res.sendStatus(204);
  });
  app.delete("/api/v1/consents/:id", async (req, res) => {
    const id = idSchema.parse(req.params.id);
    await change(
      req,
      res,
      "CONSENT_REVOKED",
      (u) => {
        const consent = u.workspace.consents.find((c) => c.id === id);
        if (!consent)
          throw new ApiError(404, "CONSENT_NOT_FOUND", "Consent unavailable.");
        consent.status = "revoked";
        consent.revokedAt = new Date(now()).toISOString();
      },
      true,
    );
    res.sendStatus(204);
  });
  app.get("/api/v1/sessions", async (_req, res) => {
    const u = await read(res);
    res.json(
      u.sessions
        .filter(
          (s) =>
            !s.revoked && s.expiresAt > now() && s.lastSeen + 1800000 > now(),
        )
        .map((s) => ({
          id: s.id,
          device: s.device,
          createdAt: s.createdAt,
          lastSeen: s.lastSeen,
          expiresAt: s.expiresAt,
          current: s.id === ctx(res).sessionId,
        })),
    );
  });
  app.delete("/api/v1/sessions/:id", async (req, res) => {
    const id = idSchema.parse(req.params.id);
    await options.store.mutate(ctx(res).userId, (u) => {
      auth.requireSession(u, ctx(res).sessionId);
      const s = u.sessions.find((s) => s.id === id);
      if (!s)
        throw new ApiError(404, "SESSION_NOT_FOUND", "Session unavailable.");
      s.revoked = true;
      audit(
        u,
        "SESSION_REVOKED",
        ctx(res).requestId,
        new Date(now()).toISOString(),
      );
    });
    res.sendStatus(204);
  });
  app.post("/api/v1/logout", async (_req, res) => {
    await options.store.mutate(ctx(res).userId, (u) => {
      auth.requireSession(u, ctx(res).sessionId).revoked = true;
      audit(
        u,
        "SESSION_REVOKED",
        ctx(res).requestId,
        new Date(now()).toISOString(),
      );
    });
    res.sendStatus(204);
  });
  app.post("/api/v1/logout-all", async (_req, res) => {
    await options.store.mutate(ctx(res).userId, (u) => {
      auth.requireSession(u, ctx(res).sessionId);
      u.sessions.forEach((s) => {
        s.revoked = true;
      });
      audit(
        u,
        "ALL_SESSIONS_REVOKED",
        ctx(res).requestId,
        new Date(now()).toISOString(),
      );
    });
    res.sendStatus(204);
  });
  app.get("/api/v1/audit", async (_req, res) => {
    const u = await read(res);
    res.json(u.audit.slice(-50).reverse());
  });
  app.post("/api/v1/export", async (_req, res) => {
    const workspace = await options.store.mutate(ctx(res).userId, (u) => {
      auth.requireRecent(u, ctx(res).sessionId);
      audit(
        u,
        "FINANCIAL_EXPORT_REQUESTED",
        ctx(res).requestId,
        new Date(now()).toISOString(),
      );
      return u.workspace;
    });
    res.json(workspace);
  });
  app.post("/api/v1/payments", (_req, _res) => {
    throw new ApiError(
      403,
      "PAYMENTS_DISABLED",
      "Payment execution is unavailable pending provider, operating-model and security approval.",
    );
  });
  app.use((_req, _res, next) =>
    next(new ApiError(404, "NOT_FOUND", "This action is unavailable.")),
  );
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const api =
        error instanceof ApiError
          ? error
          : error instanceof z.ZodError
            ? new ApiError(
                400,
                "INVALID_INPUT",
                "Check the supplied values and try again.",
              )
            : error instanceof SyntaxError
              ? new ApiError(
                  400,
                  "INVALID_JSON",
                  "Request must contain valid JSON.",
                )
              : (error as { type?: string })?.type === "entity.too.large"
                ? new ApiError(
                    413,
                    "PAYLOAD_TOO_LARGE",
                    "Request is too large.",
                  )
                : new ApiError(
                    503,
                    "SERVICE_UNAVAILABLE",
                    "We could not complete that action. Please try again.",
                  );
      res.status(api.status).json({
        error: {
          code: api.code,
          message: api.message,
          requestId: ctx(res).requestId,
        },
      });
    },
  );
  return app;
}
