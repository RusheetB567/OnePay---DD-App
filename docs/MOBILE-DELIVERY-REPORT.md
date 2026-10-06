# Mobile rebuild delivery report — 6 October 2026

## What Was Wrong
First-run setup was absent, subscription costs had no dedicated screen, income lacked a history view, Month was a rolling 30-day agenda, and calendar defaults used UTC rather than the user's civil timezone. Secondary API session failures did not immediately invalidate the central workspace. Secure-storage writes could race logout. Transaction amount/category filters were missing from the interface.

## What Changed
Added persisted guided onboarding, dedicated subscription and income routes, a true month grid with selected-day agenda and Day/Week/Fortnight views, timezone preferences used by backend forecasts, transaction amount/category filters, and a session-wide amount-hiding control. Expo Router now guards all protected screens centrally. The API session client is independently testable: token payloads are validated, credential writes serialized, logout invalidates pending responses and protected caches, concurrent refreshes share one rotation, and temporary service failures preserve credentials for retry. Improved forecast/security retry and error states.

## Files Changed
- `apps/mobile/src/api/session-client.ts`, `client.ts`; `state/workspace.tsx`; root `_layout.tsx`.
- New `onboarding.tsx`, `subscriptions.tsx`, `income.tsx`; calendar, payments, home, settings, transactions, notifications, forecast, security and financial UI/components.
- `shared/finance.ts`, `contracts.ts`; backend app, schemas, store, database hydration and query service.
- `tests/mobile-security.test.ts`; dependency manifests/lockfile; audit and security documentation.

## Security Impact
Refresh/logout persistence races are prevented; invalid sessions synchronously clear workspace state and protected navigation. Token shapes and API origins fail validation rather than silently accepting malformed credentials. Amount hiding is visual privacy for rendered summaries and alerts, not encryption or an access-control boundary; editors may display values being edited. Existing server authorization, revision checks, audit and payment blocks remain authoritative.

Scoped UUID patch to 11.1.1 is verified compatible with Xcode's v4 UUID generation. The attempted decoder 0.5 upgrade was rejected by compatibility testing because Expo Router's query-string 7 consumer requires a CommonJS function; the original dependency remains with an explicit advisory. Do not suppress that finding or downgrade the Expo SDK.

## Testing Performed
23 automated tests pass, including leap-year/month-boundary calendars, concurrent refresh deduplication, logout during credential persistence, revoked-session invalidation, invalid token response rejection and transient service failure. Backend check/build, mobile typecheck and Expo lint pass. Existing API ownership, revision, consent, expiry/reuse and PostgreSQL migration tests continue to pass. Dependency compatibility checks exercise URL parsing and Xcode ID generation. Browser evidence is recorded after flow verification.

## Remaining Risk
The full master brief is not complete and the application is not production-ready. The workspace-inclusive dependency report contains 21 advisories (18 high, 3 moderate); unresolved braces/node-forge and decoder findings block release. Providers remain unselected, so CDR sandbox access, MFA/passkeys/recovery and native OIDC flow cannot be verified. Native device builds/security, app-switcher protection, accessibility assistive-technology testing, operational admin/fraud, durable sync, cloud deployment, backup restore, penetration/load testing and data lifecycle remain unfinished. See SECURITY-VERIFICATION.md and SECURITY-CONTROLS.md. No code was committed or deployed.

## Next Action
Review the functional mobile flows, choose identity/CDR providers, remediate the unresolved upstream dependency findings, and verify a signed native development build before public release.

Final browser verification: registration, onboarding completion, amount masking, subscription and income views, and the rebuilt month calendar were exercised at localhost:8081. A clean Metro restart resolved an obsolete shared-module export cache. Screenshot: mobile-calendar-review.png. The synced Desktop preview loads at localhost:8082 with its API at localhost:4001. Final checks: 23/23 tests, both TypeScript checks, backend build and mobile lint passed. Native-device and live-provider checks remain pending.
