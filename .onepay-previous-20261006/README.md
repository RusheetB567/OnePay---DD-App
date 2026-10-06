# OnePay

A responsive, local proof of concept for **the calendar for your money**. Built from the project initiation brief. This first iteration implements the financial visibility and planning layer for review, using sample data only.

## Run locally

Requires Node.js 22 or later. No dependency installation is needed.

```sh
npm run dev
```

Open http://localhost:3000. To use another local port, set the `PORT` environment variable. The server binds to localhost only.

```sh
npm test
npm run check
```

## Review the app

- **Overview:** available balance, upcoming commitments, conservative safe-to-spend estimate, expected payday and 30-day forecast.
- **Calendar:** navigate months and open expected income or payment details.
- **Payments:** search, filter, add and edit recurring commitments, income, categories and notes. Pause or remove tracking.
- **Insights:** detect recurring merchants from sample transaction history, review a price increase and confirm tracking.
- **Accounts:** simulate consent, connect another sample institution, disconnect or reconnect accounts.
- **Settings:** display name, safety buffer, in-app reminders, JSON export, local activity and sample-data reset.

Changes persist in this browser's localStorage. Use only fictional information. No passwords, real bank credentials, real account connections, transfers or payment authorisations are implemented. Removing or pausing a tracked item does not cancel a bank payment. Notifications are in-app only.

## Calculation rules

All amounts use integer AUD cents. Forecasts start from connected spending and bills accounts; savings are excluded. Recurrences include today through the selected horizon, respect month-end dates and omit paused tracking or disconnected accounts. Safe-to-spend is the lowest aggregate balance over the next 30 days (including the opening balance), less the configured buffer, floored at zero. Income is estimated, not guaranteed. Untracked and day-to-day spending are excluded. Aggregate balances do not establish whether a particular account can fund its own debits.

## Scope and next steps

This is a browser prototype, not a production financial platform or native iOS/Android app. See [architecture and delivery plan](docs/FOUNDATION.md) for the next implementation stages. Authentication, backend persistence, provider sandboxes, real CDR consent, PayTo, immutable auditing, push delivery and administrative controls still require implementation and review. The brief's complete long-term scope is not represented as production-ready functionality.
