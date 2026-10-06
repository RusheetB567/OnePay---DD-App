# Backend gap assessment — 6 October 2026

The backend added during the preceding workstream is Express 5 with strict TypeScript, Zod validation, Argon2id development identity, hashed opaque sessions, token rotation/reuse detection, server resource ownership, server forecasts and a PostgreSQL adapter. API tests exercise actual HTTP requests. Preserve these behaviors rather than replacing the framework just to adopt NestJS.

## Gaps to fix in this increment

- Financial state resides in a JSONB aggregate; database constraints do not independently enforce per-account ownership, transaction uniqueness or commitment amounts.
- Route handlers contain domain rules and one API composition file is too large.
- Bootstrap returns all transaction history; the mobile explorer filters client-side instead of using a bounded API feed.
- Notifications are computed in the UI. Move relevance and privacy decisions to the server.
- No readiness test of the datastore; unexpected failures are safely returned but not operationally observable.
- Configuration accepts arbitrary environment strings; restrict explicit environment/provider modes.
- Synthetic transaction history did not reliably demonstrate the documented price-increase case.
- The PostgreSQL adapter has not yet been exercised against an available PostgreSQL engine; add migration/repository evidence.
- TypeScript 7 from the initial registry install was incompatible with Expo lint's TypeScript API. Aligned to Expo-supported TypeScript 6.
- Provider identity/CDR access remains unselected; synthetic banking and password sign-in must stay development-only.
- Mobile dependency advisories remain release blockers. Do not use audit force-downgrades that break Expo compatibility.

## Delivery order

1. Typed configuration, safe diagnostics and distinct liveness/readiness.
2. Normalised financial tables with ownership foreign keys, integer amounts, provider uniqueness, indexes and migrations.
3. Repository/database integration tests and transactional read consistency.
4. Extract financial services; add server-side transaction pagination/filtering, subscription summaries and notification decisions.
5. Refine existing mobile home/calendar/navigation and wire the new endpoints; correct asynchronous state and session edge cases.
6. Add API specification, threat model, security evidence and deployment/run instructions; keep the Desktop review copy updated and leave Git uncommitted.

## Release boundary

This work provides a reviewable development platform, not CDR accreditation, payment authority or a production certification. Real provider sandbox tests, verified identity/MFA/recovery, infrastructure key management, encrypted backups/restoration, native-device testing, operational monitoring and unresolved dependency vulnerabilities block consumer deployment.
