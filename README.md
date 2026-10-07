# OnePay

An Expo / React Native mobile application and TypeScript API for Australian financial visibility and planning. This checkout implements a reviewable development foundation. Live identity and banking providers have not been selected; real banking and payment initiation are unavailable.

## Start

Use Node.js 24 LTS and npm. From this repository:

```powershell
npm ci
npm run dev
```

Open http://localhost:8082 for the app. Port 4001 serves the API only. The command opens the website in your default browser and reuses a running OnePay preview rather than starting a second copy. Create a fictional development account and connect the labelled sample bank. Without DATABASE_URL, restarting the API erases sample accounts and sessions. Browser login resets on reload; native refresh credentials use SecureStore.

The individual commands remain `npm run dev:api` (API on 4000 by default) and `npm run dev:web` (mobile web). The original static demo is `npm run dev:demo`.

For PostgreSQL, set DATABASE_URL and DATABASE_TLS in the process environment, apply `npm run db:migrate`, then start the API. TLS is required by default; DATABASE_TLS=local is for a trusted local database only. `.env.example` documents configuration; environment files are not loaded automatically. Do not commit secrets. Native device testing needs an HTTPS API endpoint accessible from the device; localhost refers to the device itself.

## Checks

```powershell
npm test
npm run check
npm run check:mobile
npm --prefix apps/mobile run lint
npm run build
```

24 tests cover financial calculations, hostile authenticated API requests, PostgreSQL migrations and ownership constraints, pagination, privacy and release configuration. Embedded PostgreSQL tests do not replace testing a managed PostgreSQL deployment.

## Structure

- `apps/mobile/src/app`: Expo Router screens and five main tabs.
- `backend`: API, identity/banking boundaries, auth, storage and domain services.
- `backend/migrations`: relational PostgreSQL schema and aggregate-data migration.
- `shared`: integer-cent financial contracts and deterministic recurrence/forecast logic.
- `tests`: domain, API, service and database regression checks.

[Implementation report](docs/IMPLEMENTATION-REPORT.md), [architecture](docs/ARCHITECTURE.md), [API reference](docs/API.md), [security verification and release blockers](docs/SECURITY-VERIFICATION.md).

Leave changes uncommitted for review. No GitHub remote is configured in this checkout; link the existing repository before pushing.

Latest mobile changes: guided onboarding, subscription/income screens, month-grid calendar, timezone preferences, transaction amount/category filters, visual amount hiding and session-race protection. See [mobile delivery report](docs/MOBILE-DELIVERY-REPORT.md).
