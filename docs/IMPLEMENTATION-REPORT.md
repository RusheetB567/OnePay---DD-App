# Implementation report — 6 October 2026

## Problem
The original static browser demonstration used local sample data and could not act as an authoritative backend for a financial mobile app. The later API foundation held financial records in a single JSON aggregate and mixed domain operations into routes.

## Solution
Added an Expo mobile app, an authenticated TypeScript API, provider interfaces, server-owned financial calculations and relational financial persistence. This pass extracts commitment/classification logic into services, adds filtered cursor transaction feeds, server alerts and subscription summaries, readiness checks and safe request diagnostics. The mobile home now highlights safe-to-spend; transactions and alerts consume dedicated API endpoints with loading, failure and retry states.

## Files Changed
`backend/app.ts`, `auth.ts`, `store.ts`, `database.ts`, `config.ts`, `observability.ts`, `main.ts`, `migrate.ts`, `services/*`, `providers/*`, `schemas.ts`; `shared/*`; `apps/mobile/src/*`; root workspace/dependency configuration; `tests/*`; documentation. The old demonstration remains separately runnable.

## Database Changes
Migration 001 creates users, workspaces, sessions and append-only audit events. Migration 002 separates consents, accounts, transactions and recurring commitments, backfills existing aggregate data, adds same-owner composite foreign keys, provider uniqueness, amount/currency constraints and feed indexes. Financial updates and audit insertion commit atomically under a user-row lock. Security-only mutations avoid rewriting the financial workspace. Audit hashes use a canonical field sequence so JSONB key reordering does not invalidate verification.

## API Changes
Versioned authenticated endpoints support forecasts, calendars, commitments, pattern review, transactions, connection consent, sessions and exports. New transaction list/detail, notifications, subscriptions and readiness endpoints are documented in API.md. Revision preconditions reject stale financial writes. No endpoint executes bank payments.

## Security Impact
Argon2id development credentials; verified OIDC adapter boundary; short-lived opaque access credentials; hashed, rotated refresh credentials with reuse revocation; owner-scoped operations; strict request validation; recent-login checks; origin/rate/payload restrictions; no-store responses; safe request logs. Mobile access tokens stay in memory; native refresh tokens use platform storage. Financial data clears on logout even if secure-storage deletion throws. This is implementation evidence, not a security certification.

## Tests
19 automated tests pass. Backend and mobile typechecks, backend build and Expo lint pass. Database tests use PGlite's PostgreSQL engine for migrations, persistent round trips, cross-user constraint failures, provider duplicate rollback and audit immutability. Browser review passed development registration, synthetic consent, income/subscription confirmation, updated forecast, privacy-aware alerts, server merchant filtering and transaction notes save. The home screen was inspected at 390 × 844 with no captured console errors; docs/mobile-review.png records the result.

## Remaining Risks
See SECURITY-VERIFICATION.md. Most critically, providers are not configured, dependency advisories remain, native devices and a managed database deployment are unverified, and operational controls required by the full production brief are unfinished. Cursor responses are bounded but currently filter hydrated owner records in memory: SQL pagination and large-history performance must be completed before production. Financial mutations upsert all owner records; this must become incremental. The API uses Express rather than the brief's requested NestJS architecture; a framework migration remains a separate architectural decision. No remote is configured and no commit or deployment was made.

## Next Step
Review the interface and flows, then select identity and CDR providers and implement real sandbox adapters. Complete native testing, dependency remediation, SQL query paths, data lifecycle and deployment controls before enabling a public release.
