import test from "node:test";
import assert from "node:assert/strict";
import { SessionClient } from "../apps/mobile/src/api/session-client.js";
import { calendarPeriod, monthCells, movePeriod } from "../shared/finance.js";
const tokens = {
  accessToken: "a".repeat(43),
  refreshToken: "b".repeat(43),
  expiresIn: 300,
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
test("calendar month uses actual bounds across leap years and year changes", () => {
  assert.deepEqual(calendarPeriod("2024-02-29", "Month"), {
    start: "2024-02-01",
    days: 28,
  });
  assert.equal(movePeriod("2026-12-31", "Month", 1), "2027-01-01");
  const cells = monthCells("2026-10-05");
  assert.equal(cells.filter(Boolean).length, 31);
  assert.equal(cells.length % 7, 0);
  assert.equal(movePeriod("2026-10-05", "Fortnight", 1), "2026-10-19");
  assert.throws(() => calendarPeriod("2026-02-30", "Month"));
});
test("logout waits behind refresh persistence and cannot restore credentials", async () => {
  let stored: string | null = null,
    release: () => void = () => {},
    started: () => void = () => {};
  const saved = new Promise<void>((r) => (started = r)),
    blocked = new Promise<void>((r) => (release = r));
  const client = new SessionClient(
    "https://api.example.test",
    {
      load: async () => stored,
      save: async (v) => {
        if (v === tokens.refreshToken) {
          started();
          await blocked;
        }
        stored = v;
      },
    },
    async () => reply({}),
  );
  const setting = client.setTokens(tokens);
  await saved;
  let invalidated = 0;
  client.onInvalidated(() => invalidated++);
  const clearing = client.clearTokens();
  release();
  await assert.rejects(setting);
  await clearing;
  assert.equal(stored, null);
  assert.equal(invalidated, 1);
});
test("concurrent expired requests share rotation; revoked sessions invalidate protected caches", async () => {
  let stored: string | null = tokens.refreshToken,
    count = 0,
    expired = true,
    invalidated = 0;
  const client = new SessionClient(
    "https://api.example.test",
    {
      load: async () => stored,
      save: async (v) => {
        stored = v;
      },
    },
    async (input) => {
      if (String(input).endsWith("/auth/refresh")) {
        count++;
        expired = false;
        return reply({
          ...tokens,
          accessToken: "c".repeat(43),
          refreshToken: "d".repeat(43),
        });
      }
      return expired
        ? reply({ error: { code: "SESSION_EXPIRED" } }, 401)
        : reply({ ok: true });
    },
  );
  client.onInvalidated(() => invalidated++);
  const results = await Promise.all([
    client.request("/one"),
    client.request("/two"),
  ]);
  assert.equal(results.length, 2);
  assert.equal(count, 1);
  const denied = new SessionClient(
    "https://api.example.test",
    { load: async () => tokens.refreshToken, save: async () => {} },
    async () => reply({ error: { code: "SESSION_EXPIRED" } }, 401),
  );
  denied.onInvalidated(() => invalidated++);
  await assert.rejects(denied.request("/transactions"));
  assert.equal(invalidated, 1);
});
test("invalid token response is rejected and transient refresh failure preserves credential for retry", async () => {
  let stored = tokens.refreshToken;
  const client = new SessionClient(
    "https://api.example.test",
    {
      load: async () => stored,
      save: async (v) => {
        stored = v || "";
      },
    },
    async () => reply({ error: { code: "UNAVAILABLE" } }, 503),
  );
  await assert.rejects(client.setTokens({ ...tokens, accessToken: "bad" }));
  await assert.rejects(client.restoreSession());
  assert.equal(stored, tokens.refreshToken);
});
