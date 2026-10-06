# Mobile rebuild audit and ordered plan — 6 October 2026

## Retain
Expo SDK 57 / React Native 0.86 / Expo Router; strict TypeScript workspace; in-memory access tokens and native SecureStore refresh storage; authenticated Express API and provider interfaces; normalized PostgreSQL financial tables; deterministic integer-cent recurrence/forecasting; explicit synthetic fixture adapter; existing consent, session, commitment, classification and forecast flows. No migration to another framework is justified by appearance.

## Gaps found before implementation

| Severity / priority | Finding | Action |
|---|---|---|
| High if released | Provider/MFA/recovery/CDR integrations and physical-device security tests absent | Keep release gate; provider choice remains pending |
| High | Refresh persistence can race logout; secondary API 401 does not immediately clear all screen caches | Extract testable session transport; serialize credential persistence and invalidate workspace on expiry |
| High / release blocker | Workspace dependency audit includes unpatched braces and node-forge advisories | Apply compatible available patches, retain evidence and block release for unresolved findings |
| Medium | All protected routes are not centrally guarded | Central Expo Router protected stack; direct-link/logout verification |
| Medium | Calendar starts in UTC and Month is a rolling 30-day agenda | Profile civil timezone, true month grid, accessible selected-day agenda |
| Medium | No guided first-run setup or persistent completion state | Server-backed onboarding preferences and progress |
| Medium | Subscription endpoint has no dedicated UI; income only shares payments filter | Dedicated server-backed subscription/income screens with evidence and correction links |
| Medium | Transaction amount/category filtering exists incompletely or is absent in UI | Server category filter; validated amount range UI |
| Medium | Sensitive balances cannot be hidden; refresh/session errors have inconsistent screen states | Shared privacy-aware financial typography and remote load/error/empty states |
| Medium | Calendar, forecast, security remote failures lack reliable retries | Shared retry affordances and safe navigation |
| Medium / ops | No CI, native release profile, threat model or control evidence matrix | Add repeatable local/CI checks and explicit unverified gates |
| Low | Home/secondary card hierarchy is verbose; labels use raw domain text | Consistent badges, compact summaries, useful navigation |

## Ordered implementation
1. Stabilize dependency resolution and establish baseline tests.
2. Correct session lifecycle/races and protect deep-linked screens centrally.
3. Add backward-compatible profile settings (timezone, onboarding, balance privacy) and version contract.
4. Implement first-run flow, subscription/income views, useful payment navigation and transaction filters.
5. Replace rolling-month calendar with civil-date grid plus day/week/fortnight agendas.
6. Verify hostile API inputs, session races, calculation dates, navigation and browser flows.
7. Record evidence, threat model, security-control matrix and native/deployment gates; sync Desktop without overwriting divergent user changes.

## Constraints
No provider selected or credentials supplied. This repository has no GitHub remote and remains uncommitted for review. Provider-backed authentication, real banking, payment execution, cloud deployment, native app-store builds and a no-high-vulnerabilities release claim cannot be verified from this environment. They remain explicit unfinished work rather than simulated capabilities.
