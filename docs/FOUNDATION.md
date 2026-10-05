# Project foundation and delivery boundary

## First review increment

The initial empty repository now contains a runnable financial-calendar prototype. The brief's Understand → Plan → Act → Optimise sequence sets the delivery order. This increment covers manual recurring obligations, sample bank visibility, transaction pattern discovery, income, calendars, forecasts and local consent simulation. It deliberately uses fictional financial information.

## Structure

- `src/finance.js`: independent integer-cent calculation, recurrence and pattern detection functions; reusable in a future backend or mobile client.
- `src/data.js`: rolling sample scenario relative to the review date.
- `src/app.js`: browser views, forms and local demo storage.
- `src/styles.css`: responsive visual system.
- `server.js`: localhost static preview, explicit asset allowlist and restrictive response headers.
- `tests/finance.test.js`: calculation boundary cases.

The minimal runtime has no external dependencies. The UI can be replaced by TypeScript/React Native later while preserving documented domain behavior. Local data and local activity logs are neither secured financial storage nor immutable audit records.

## Production target

Mobile and web clients → authenticated modular Node.js/TypeScript API → PostgreSQL. Separate domain modules for identity, users, accounts, transactions, recurring commitments, income, forecasts, consent and audit. Add banking and payment adapters at the service boundary, not inside client calculations. Provider credentials and secrets belong on the server.

Banking adapters should support institution listing, consent redirect creation, consent status/revocation, account and transaction normalisation, webhook validation and retry-safe synchronisation. Select an intermediary and test its genuine sandbox before claiming a banking integration. Payment adapters should remain disabled until a provider, operating model and authorisation workflow are agreed.

## Planned data entities

User/Profile, Device/Session, Institution, BankConnection, Consent, Account, Transaction, Merchant, RecurringCommitment, IncomeSource, FinancialEvent, Notification and AuditEvent. Monetary values use integer cents plus currency; externally sourced records need provider IDs and idempotency keys. Store source account, merchant, frequency, amount, expected date, confidence, lifecycle status and user overrides on commitments. Provider consent and payment status must be distinct from tracking status.

## Suggested upcoming increments

1. Review the screens, terminology, safe-to-spend assumptions and mobile layout with the project owner.
2. Add TypeScript domain contracts, backend persistence, migrations, authenticated ownership checks and a real identity-provider sandbox.
3. Integrate the chosen banking-provider sandbox, server-side consent lifecycle, transaction import and recurring-income detection from imported data.
4. Improve forecasting with per-account shortfalls, variable bills, user spending budgets, duplicate detection and confidence-aware events.
5. Add persistent notifications, data export/deletion, retention policies and a separate role-controlled admin surface.
6. Complete provider, security and operating-model reviews before handling consumer financial data or enabling any payment initiation.
7. Implement authorised PayTo/payment integration, idempotent processing, reconciliation and monitored audit trails.

## Known limitations

No registration or login, real banking APIs, server database, production encryption, biometric authentication, external calendar sync or money movement. Demo consent is a user-interface simulation. The detection engine groups exact normalised merchant names and requires at least three transactions; it does not yet resolve merchant aliases or quarterly/annual patterns. Monthly equivalents use 52 weekly and 26 fortnightly payments per year. Forecasts aggregate eligible accounts and omit discretionary spending; a positive aggregate forecast may still conceal an individual account shortfall. Daily/weekly/annual calendar modes and administrative screens remain future work.
