# OnePay

An Expo / React Native mobile application and TypeScript API for Australian financial visibility and planning. This checkout implements a reviewable development foundation. Live identity and banking providers have not been selected; real banking and payment initiation are unavailable.

## Start

Use Node.js 24 LTS and npm. From this repository:

```powershell
npm ci --legacy-peer-deps
npm run dev
```

In a second terminal:

```powershell
npm run dev:web
```

Open http://localhost:8081. The API listens on http://localhost:4000. Create a fictional development account, connect a labelled synthetic bank, review recurring patterns, and add commitments. Without DATABASE_URL, data is volatile and resets when the API restarts. Browser login resets on refresh; native refresh credentials use SecureStore. The original static demonstration remains available with `npm run dev:demo` at port 3000.

For PostgreSQL, set DATABASE_URL and DATABASE_TLS in the process environment, apply `npm run db:migrate`, then start the API. TLS is required by default; DATABASE_TLS=local is for a trusted local database only. `.env.example` documents configuration; environment files are not loaded automatically. Do not commit secrets. Native device testing needs an HTTPS API endpoint accessible from the device; localhost refers to the device itself.

## Checks

```powershell
npm test
npm run check
npm run check:mobile
npm --prefix apps/mobile run lint
npm run build
```

19 tests cover financial calculations, hostile authenticated API requests, PostgreSQL migrations and ownership constraints, pagination, privacy and release configuration. Embedded PostgreSQL tests do not replace testing a managed PostgreSQL deployment.

## Structure

- `apps/mobile/src/app`: Expo Router screens and five main tabs.
- `backend`: API, identity/banking boundaries, auth, storage and domain services.
- `backend/migrations`: relational PostgreSQL schema and aggregate-data migration.
- `shared`: integer-cent financial contracts and deterministic recurrence/forecast logic.
- `tests`: domain, API, service and database regression checks.

[Implementation report](docs/IMPLEMENTATION-REPORT.md), [architecture](docs/ARCHITECTURE.md), [API reference](docs/API.md), [security verification and release blockers](docs/SECURITY-VERIFICATION.md).

Leave changes uncommitted for review. No GitHub remote is configured in this checkout; link the existing repository before pushing.
