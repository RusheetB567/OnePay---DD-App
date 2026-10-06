# API reference

Base: http://localhost:4000/api/v1. JSON request/response bodies. All endpoints except config and auth require `Authorization: Bearer <accessToken>`. Financial writes require `If-Match: <bootstrap revision>`. Errors return a stable code/message and generated request ID; validation errors use 400, missing session 401, denied action 403, absent owned resource 404, stale revision 409, rate limit 429 and unavailable service 503.

| Method | Path | Purpose |
|---|---|---|
| GET | /config | Capabilities and development mode |
| POST | /auth/register, /auth/login | Development-only credentials |
| POST | /auth/exchange | Verified configured OIDC ID token exchange |
| POST | /auth/refresh | Rotate refresh token; detect reuse |
| GET | /bootstrap | Profile, accounts, consent, commitments, patterns, forecast and latest 100 transactions |
| GET | /forecast?days=30 | 1–90 day forecast with assumptions |
| GET | /calendar?start=YYYY-MM-DD&days=30 | Civil-date agenda |
| PATCH | /profile | Name, buffer cents, theme, reminders and notification privacy |
| POST/PATCH/DELETE | /commitments[/:id] | Track, edit, pause or remove a commitment |
| POST | /patterns/review | Confirm or ignore a detected pattern |
| GET | /transactions | Filtered feed, limit 1–100, nextCursor |
| GET/PATCH | /transactions/:id | Owned detail / classification and notes |
| GET | /subscriptions | Monthly equivalent and annual active tracked cost |
| GET | /notifications | Privacy-aware in-app payment/pattern/consent/security alerts |
| GET | /institutions | Configured adapter institution list |
| POST | /connections | Explicit sample consent and connection |
| POST | /connections/:id/sync | Deduplicated sample synchronization |
| DELETE | /consents/:id | Revoke tracking access |
| GET | /sessions, /audit | Own sessions and audit history |
| POST | /logout, /logout-all | Revoke session(s) |
| DELETE | /sessions/:id | Revoke an owned session |
| POST | /export | Recent-login authenticated workspace export |
| POST | /payments | Always denied; no payment execution |

Outside the versioned base: GET /health for liveness, GET /ready for store readiness.

Transaction filters: search, accountId (UUID), from/to (civil date), minAmount/maxAmount (absolute integer cents), filter (All/Income/Subscriptions/Recurring/Utilities), limit, cursor. A cursor binds the exact filter and limit; restart pagination when filters change. Cross-owner account IDs fail. Pages are bounded; current data hydration/filtering remains in memory and is a documented scale blocker.

The schemas in backend/schemas.ts and shared/contracts.ts define financial inputs and outputs. This reference is not an OpenAPI generation pipeline; automatic schema documentation remains future work.

GET /income returns owner-scoped tracked income, posted-history patterns and forecast assumptions. Profile also supports a validated Australian timeZone and onboardingCompleted; old callers default to Adelaide and incomplete setup. Transaction filters now accept category.
