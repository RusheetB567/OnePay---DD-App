# Repository audit — 5 October 2026

## Baseline inspected

Root `package.json`, `server.js`, `index.html`, every file in `src/` and `tests/`, Git status/history/remotes, and the Desktop project copy. The repository has no commits and no configured Git remote. The Desktop copy contains the same prototype plus ignored preview logs. No existing native app, API, database, identity provider, CI or deployment configuration exists.

## Working features to retain

Integer-cent forecast and recurrence helpers; month-end anchoring; monthly calendar; local commitment editing; search; sample consent UI; sample detection; JSON export. These are development behavior, not server-authoritative financial operations. Retain the original browser demo separately for reference, and migrate domain behavior to typed/tested modules.

## Findings

| Severity if used with real data | Finding | Required disposition |
|---|---|---|
| Critical | No authentication/ownership enforcement or authoritative backend | Build authenticated API; never expose demo as production |
| High | Financial data stored in browser localStorage | Keep old demo synthetic; new client financial state memory-only |
| High | Browser can edit balances, consent and audit records | Move commands, validation, calculations and auditing server-side |
| High | No database, durable sessions or release/deployment controls | PostgreSQL adapter/migration and explicit release blockers |
| High | No real consent/provider lifecycle | Provider boundary; simulated provider explicitly development-only |
| Medium | Calculation dates use host timezone; unsafe input can reach loops | UTC civil-date arithmetic, strict input schemas, bounded horizon |
| Medium | Aggregate forecasts conceal account-specific shortfalls | Add per-account projections and explain funding risk |
| Medium | Same-day netting conceals debit-before-income pressure | Evaluate outgoing amounts before same-day expected income |
| Medium | No provenance, reproducibility metadata or confidence evidence | Add calculation version, assumptions and event evidence |
| Medium | No native accessibility/theme/session lifecycle | Native design tokens, labelled touch controls, light/dark/system themes |
| Low | Monolithic browser view/controller, no typed contracts | New domain-oriented mobile/API modules; retain demo isolation |

Severity reflects the production threat scenario, not an assertion that this localhost synthetic demo has compromised consumers. No hardcoded credentials found in reviewed source; there is no Git history to scan. This is a code audit, not a penetration test or security certification.

## Ordered implementation

1. Preserve browser demo; establish strict TypeScript API/domain contracts, runtime schemas and tests.
2. Build server identity boundary, Argon2id development accounts, expiring hashed sessions, rotation/reuse detection, ownership, validation and safe errors.
3. Add PostgreSQL migration/adapter and locked transactional mutations; memory adapter only in explicit development/test.
4. Build Expo/React Native client with Router, secure native refresh storage, memory access tokens and financial views, meaningful error/empty/loading states.
5. Move forecasts/recurrence to API, add source/account evidence, calendar range modes and account-specific warnings.
6. Build deterministic synthetic bank adapter, idempotent import and consent lifecycle; real adapter unavailable until provider selection.
7. Add security/privacy/support screens and server-gated payment boundary; document controls and remaining release blockers.
8. Run unit, API abuse/ownership/session integration tests, typechecks, mobile lint/bundle checks and local smoke checks.

## External prerequisites

Owner confirmed no identity or CDR provider selected. Provider registration, redirect allowlists, sandbox credentials, production key management, managed PostgreSQL, email verification/recovery, mobile signing and device testing must be supplied/verified separately. Do not invent provider integrations or declare a production-ready release without those controls and evidence.
