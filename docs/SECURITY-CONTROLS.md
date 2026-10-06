# Security-control evidence matrix — 6 October 2026

This maps implementation evidence to the brief's requirements and OWASP mobile/API control areas. It is not a claim of MASVS, ASVS or Australian legal compliance. References: https://mas.owasp.org/MASVS/ and https://docs.expo.dev/router/advanced/protected/.

| Control | Requirement | Implementation / location | Test / evidence | Status | Risk / remediation |
|---|---|---|---|---|---|
| Session lifecycle | Clear protected data after logout/revocation | api/session-client.ts; state/workspace.tsx; root router layout | mobile-security tests (logout race, revoked session, concurrent refresh) | Implemented/tested locally | Physical-device lifecycle still required |
| Token storage | Minimum credentials in platform storage | api/client.ts SecureStore; memory-only access/browser credentials | Source review + testable storage abstraction | Partial | Native extraction/hardware behavior unverified |
| Authorization | Principal-scoped financial records | backend/app.ts; store.ts; composite database foreign keys | api.test.ts; database.test.ts | Implemented/tested locally | Managed database roles and full BOLA suite required |
| Validation | Reject malformed amounts, dates, unexpected fields | schemas.ts; services/queries.ts; shared civil date/integer cents | domain/api/service tests | Implemented/tested locally | Provider snapshot schemas and webhook replay missing |
| Financial integrity | Deterministic forecasts and honest prediction | shared/finance.ts; forecast and calendar views | domain/finance/mobile-security tests | Implemented/tested locally | Historical reconciliation and live-provider timing unverified |
| Mobile navigation | Deep links cannot bypass authenticated route guard | app/_layout.tsx Stack.Protected | Browser direct-route/logout checks | Partial | Signed native deep-link testing required |
| Privacy | Hide displayed financial amounts; notification privacy | design-system/ui.tsx useMoney; workspace hideAmounts; notification service | Browser checks; server notification tests | Partial | Not encryption; editors and exports require access controls |
| Audit | Atomic security/financial events and immutable normal operation | store.ts; migrations/001-foundation.sql | database test deletion rejection/hash chain | Partial | External anchoring, privileged-operator controls required |
| Transport | HTTPS production origin and no TLS bypass | api/client.ts; config.ts; migrate.ts | Source/config tests | Partial | Infrastructure and native device TLS testing required |
| Dependencies | No unresolved release-blocking vulnerabilities | package-lock.json; docs/dependency-audit.json | Workspace npm audit; decoder/Xcode compatibility checks | BLOCKED | 18 high + 3 moderate advisories; do not claim production readiness |
| Identity/banking | Real reviewed provider and strong authentication | providers/identity.ts/banking.ts boundaries | Synthetic-only integration tests | BLOCKED | Provider selection, sandbox access and MFA/recovery required |
| Operations/payments | Risk, signed callbacks, idempotent authorization, recovery | Payment endpoint denies requests; release config gate | API denied-payment/config tests | BLOCKED | Payment/admin/cloud operational work not implemented |

## Threat model
Trust boundaries: device ↔ HTTPS API; API ↔ identity/banking provider; API ↔ PostgreSQL; privileged operations ↔ customer records. Assets include refresh credentials, account/transaction data, consent, forecast integrity and audit evidence. Relevant abuse cases are stolen/replayed refresh credentials, late responses after logout, cross-user IDs, forged amounts/dates, stale updates, duplicate provider imports, deep-link access to stale screens and privileged audit rewriting. Current controls address local/session/owner/calculation boundaries. Missing provider, administrative, infrastructure and native verification gates remain separate release blockers.
