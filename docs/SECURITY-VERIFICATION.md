# Security verification and release gates

Production/staging startup deliberately fails. Do not remove this gate merely to deploy the demo.

## Verified locally

- Owner-isolated API mutations and database foreign keys; stale revision rejection.
- Authentication expiry, refresh rotation/reuse revocation, generic credential failures and recent-login checks.
- Strict integer-cent and date validation; savings excluded; account funding warnings; monthly/leap-year recurrence; debit-before-income ordering.
- PostgreSQL migrations, normalized persistence, unique provider transaction IDs, rollback and append-only audit trigger.
- Private/hidden alert payloads, no-store headers, exact-origin CORS and request/payload bounds.
- Typechecks, lint, build and 23 regression tests.

## Unverified or unfinished

- Live identity/CDR provider selection, sandbox end-to-end integration, MFA/passkeys, recovery, email verification, native OIDC authorization flow and provider consent redirects.
- PayTo/payment authorization, provider signatures, webhook replay defense and idempotency, fraud/risk controls. Payment endpoints remain blocked.
- Native iOS/Android build, physical device behavior, biometric unlock, certificate handling, accessibility screen-reader/device audit and penetration testing.
- Managed PostgreSQL roles, least privilege, backups/restore, encryption/key management, audit external anchoring and tamper monitoring. Hash chains cannot prevent a privileged operator rewriting the entire chain.
- Retention/deletion/legal policies, export scale, consent data lifecycle (timezone selection is now implemented).
- Durable jobs/outbox/retries, provider reconciliation, distributed rate limiting, metrics/alerting, cloud infrastructure, incident playbooks and support/admin workflows.
- SQL-backed pagination/incremental writes and large-data performance. Normalized tables still retain typed JSONB documents alongside constrained columns.

## Dependency findings

The explicit workspace-inclusive audit currently reports 21 advisories: 18 high and 3 moderate, primarily transitive Expo/Metro tooling. See dependency-audit.json for the saved machine-readable report. Do not run force remediation that downgrades the Expo SDK. Review patched compatible transitive versions with upstream releases and retest native builds. These findings block a production-ready claim. The local sample app must use fictional data only.

The mobile rebuild adds token-persistence race tests, central protected routes, civil timezone selection and visual amount hiding. See MOBILE-DELIVERY-REPORT.md and SECURITY-CONTROLS.md. UUID remediation is compatible; decoder remediation remains blocked by the current router dependency API.
