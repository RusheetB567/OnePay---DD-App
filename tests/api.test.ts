import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createApp } from "../backend/app.js";
import { MemoryStore, verifyAudit } from "../backend/store.js";
import {
  SyntheticBankingProvider,
  UnavailableBankingProvider,
} from "../backend/providers/banking.js";
import type { Bootstrap, Tokens } from "../shared/contracts.js";
test("authenticated financial workflow and hostile API requests", async (t) => {
  let now = Date.parse("2026-10-05T12:00:00Z");
  const store = new MemoryStore();
  const server = createApp({
    store,
    banking: new SyntheticBankingProvider(),
    mode: "development",
    origins: ["http://localhost:8081"],
    now: () => now,
    authLimit: 100,
  }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = (
    path: string,
    method = "GET",
    body?: unknown,
    access?: string,
    revision?: number,
  ) =>
    fetch(`${base}/api/v1${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
        ...(revision !== undefined ? { "If-Match": String(revision) } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  assert.equal((await request("/bootstrap")).status, 401);
  const credentials = {
    email: "alex@example.test",
    password: "correct-test-password-123",
    device: "Integration test",
  };
  const registration = await request("/auth/register", "POST", {
    ...credentials,
    name: "Alex",
  });
  assert.equal(registration.status, 201);
  const tokens = (await registration.json()) as Tokens;
  const other = (await (
    await request("/auth/register", "POST", {
      ...credentials,
      email: "other@example.test",
      name: "Other",
    })
  ).json()) as Tokens;
  assert.equal(
    (
      await request("/auth/login", "POST", {
        ...credentials,
        password: "wrong-password-123",
      })
    ).status,
    401,
  );
  const empty = (await (
    await request("/bootstrap", "GET", undefined, tokens.accessToken)
  ).json()) as Bootstrap;
  assert.equal(empty.accounts.length, 0);
  assert.equal(empty.forecast.safeToSpend, 0);
  assert.equal(
    (
      await request(
        "/connections",
        "POST",
        {
          institution: "Up",
          acceptedScopes: ["accounts", "balances", "transactions"],
        },
        tokens.accessToken,
        0,
      )
    ).status,
    201,
  );
  let workspace = (await (
    await request("/bootstrap", "GET", undefined, tokens.accessToken)
  ).json()) as Bootstrap;
  const account = workspace.accounts[0]!;
  const payment = {
    merchant: "Rent",
    amount: 145000,
    currency: "AUD",
    accountId: account.id,
    kind: "expense",
    category: "Housing",
    frequency: "fortnightly",
    nextDate: "2026-10-06",
    status: "active",
    certainty: "expected",
    notes: "",
  };
  assert.equal(
    (
      await request(
        "/commitments",
        "POST",
        { ...payment, amount: 1.5 },
        tokens.accessToken,
        1,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "/commitments",
        "POST",
        { ...payment, role: "admin" },
        tokens.accessToken,
        1,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "/commitments",
        "POST",
        { ...payment, nextDate: "2026-02-30" },
        tokens.accessToken,
        1,
      )
    ).status,
    400,
  );
  assert.equal(
    (await request("/commitments", "POST", payment, other.accessToken, 0))
      .status,
    404,
  );
  const created = await request(
    "/commitments",
    "POST",
    payment,
    tokens.accessToken,
    1,
  );
  assert.equal(created.status, 201);
  const commitment = (await created.json()) as { id: string };
  assert.equal(
    (
      await request(
        `/commitments/${commitment.id}`,
        "DELETE",
        undefined,
        other.accessToken,
        0,
      )
    ).status,
    404,
  );
  assert.equal(
    (await request("/commitments", "POST", payment, tokens.accessToken, 1))
      .status,
    409,
  );
  const pattern = workspace.patterns.find((p) => p.kind === "income")!;
  assert.equal(
    (
      await request(
        "/patterns/review",
        "POST",
        { key: pattern.key, decision: "confirm" },
        tokens.accessToken,
        2,
      )
    ).status,
    204,
  );
  workspace = (await (
    await request("/bootstrap", "GET", undefined, tokens.accessToken)
  ).json()) as Bootstrap;
  assert.equal(workspace.commitments.length, 2);
  assert.equal(
    workspace.forecast.events.some((e) => e.kind === "income"),
    true,
  );
  const txCount = workspace.transactions.length;
  const consent = workspace.consents[0]!;
  assert.equal(
    (
      await request(
        `/connections/${consent.id}/sync`,
        "POST",
        {},
        tokens.accessToken,
        3,
      )
    ).status,
    204,
  );
  workspace = (await (
    await request("/bootstrap", "GET", undefined, tokens.accessToken)
  ).json()) as Bootstrap;
  assert.equal(workspace.transactions.length, txCount);
  assert.equal(
    (
      await request(
        `/consents/${consent.id}`,
        "DELETE",
        undefined,
        other.accessToken,
        0,
      )
    ).status,
    404,
  );
  assert.equal(
    (await request("/payments", "POST", { amount: 1 }, tokens.accessToken))
      .status,
    403,
  );
  assert.equal(
    (
      await request(
        "/forecast?days=100000",
        "GET",
        undefined,
        tokens.accessToken,
      )
    ).status,
    400,
  );
  const denied = await fetch(`${base}/api/v1/bootstrap`, {
    headers: {
      Origin: "https://attacker.test",
      Authorization: `Bearer ${tokens.accessToken}`,
    },
  });
  assert.equal(denied.status, 403);
  const sensitive = await request("/export", "POST", {}, tokens.accessToken);
  assert.equal(sensitive.status, 200);
  assert.equal(sensitive.headers.get("cache-control"), "no-store");
  assert.ok(sensitive.headers.get("x-request-id"));
  assert.equal(
    (
      await request(
        `/consents/${consent.id}`,
        "DELETE",
        undefined,
        tokens.accessToken,
        4,
      )
    ).status,
    204,
  );
  workspace = (await (
    await request("/bootstrap", "GET", undefined, tokens.accessToken)
  ).json()) as Bootstrap;
  assert.equal(workspace.forecast.opening, 0);
  const rotated = (await (
    await request("/auth/refresh", "POST", {
      refreshToken: tokens.refreshToken,
    })
  ).json()) as Tokens;
  assert.notEqual(rotated.refreshToken, tokens.refreshToken);
  assert.equal(
    (await request("/bootstrap", "GET", undefined, tokens.accessToken)).status,
    401,
  );
  assert.equal(
    (await request("/bootstrap", "GET", undefined, rotated.accessToken)).status,
    200,
  );
  assert.equal(
    (
      await request("/auth/refresh", "POST", {
        refreshToken: tokens.refreshToken,
      })
    ).status,
    401,
  );
  assert.equal(
    (await request("/bootstrap", "GET", undefined, rotated.accessToken)).status,
    401,
  );
  const login = (await (
    await request("/auth/login", "POST", credentials)
  ).json()) as Tokens;
  now += 300001;
  assert.equal(
    (await request("/bootstrap", "GET", undefined, login.accessToken)).status,
    401,
  );
  const fresh = (await (
    await request("/auth/refresh", "POST", { refreshToken: login.refreshToken })
  ).json()) as Tokens;
  assert.equal(
    (await request("/export", "POST", {}, fresh.accessToken)).status,
    403,
  );
  assert.equal(
    (await request("/logout-all", "POST", {}, fresh.accessToken)).status,
    204,
  );
  assert.equal(
    (await request("/bootstrap", "GET", undefined, fresh.accessToken)).status,
    401,
  );
  const user = await store.findEmail(credentials.email);
  assert.ok(user);
  assert.ok(user.passwordHash?.startsWith("$argon2id$"));
  assert.equal(JSON.stringify(user).includes(tokens.accessToken), false);
  assert.equal(verifyAudit(user.audit), true);
  user.audit[0]!.action = "ALTERED";
  assert.equal(verifyAudit(user.audit), false);
});
test("rate limiting, payload bounds and production identity fail closed", async (t) => {
  const store = new MemoryStore();
  const server = createApp({
    store,
    banking: new UnavailableBankingProvider(),
    mode: "production",
    origins: [],
    authLimit: 2,
  }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (body: string) =>
    fetch(`${base}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  assert.equal((await post("x".repeat(40000))).status, 413);
  assert.equal((await post("{}")).status, 503);
  assert.equal((await post("{}")).status, 429);
});
