# OnePay ULTRAWORK delivery

## Implemented

The real Expo frontend now shares a cobalt/midnight visual identity, semantic palette, vector OnePay mark and icon family, readable financial typography, focus states, reduced-motion-aware entrance and loading effects, branded skeletons, and compact financial surfaces. Working API routes and integer forecast calculations were preserved.

| Screen / group | Before | After and interaction | States / accessibility / performance |
|---|---|---|---|
| Welcome / launch | Generic form and spinner | Branded introduction, session-check mark, keyboard-aware form | Disabled/busy states retain labels; secure entry; no artificial launch delay |
| Onboarding / connect | Plain sequential cards | Domain icons, permission explanation, actual sample connection result and discovered-pattern count | Sample-only disclosure; server confirmation before success; native success haptic |
| Home | Oversized independent cards | Balance, privacy eye, safe-to-spend hero, allocation ring, pressure story, money timeline and forecast | Empty/loading/error/stale states; amounts masked in accessibility labels; responsive wrapping |
| Forecast | Daily text list | Interactive SVG trajectory, day controls/tooltips, allocation and money flow, existing assumptions and daily details | Projection labels; accessible day controls; graph bounded to 31 points; native-device chart testing pending |
| Calendar | Numeric grid and agenda | Day sheet with projected opening/closing where available; event labels and shortfall annotation | Actual month bounds; events outside forecast window do not invent balances; loading skeleton; sheet dismissal |
| Accounts / account | Repetitive cards | Total across accounts, institution/mask, clear connection empty state, compact detail surfaces | Consent and sync actions retained; savings inclusion distinguished from spendable cash |
| Transactions / detail | Long filters above cards | Filter sheet, virtualised paginated feed, date groups and aligned amounts | 12 initial rows, five-window virtualization; API filters, notes and classification retained |
| Payments / commitments | Plain repeated rows | Consistent icon rows and empty-state treatment; manual editor and tracking actions retained | Actual payments remain gated; forecasts never imply bank cancellation or settlement |
| Subscriptions / income | Plain summaries | Monthly/annual cost switch, annual impact, payday and observed-history surfaces | API cost totals retained; explicit estimates; actionable domain empty states |
| Insights | Patterns only | Financial-pressure story and evidence-backed discovery / price-change review | Confirm/ignore remain real mutations; confidence remains historical evidence |
| Security / privacy / settings / support | Generic technical surfaces | Unified theme and controls, explicit development protection, server-saved privacy/calendar/Home preferences | Session revocation/export unchanged; unavailable passkeys/MFA/biometrics clearly labelled |
| Notifications / missing route | Plain rows / default missing page | Shared polished notification states and deliberate missing-route return action | Privacy preserved, actual destinations retained, no fabricated push/read receipts |

## Design and navigation specification

Tokens: `apps/mobile/src/design-system/tokens.ts`. Components: `ui.tsx`, `icons.tsx`, `financial.tsx`. Motion: `motion.tsx`. Light, dark and system themes use profile preferences. Spacing, typography, surfaces and financial colours come from the shared system.

Navigation: Welcome → Onboarding → Home / Calendar / Payments / Insights / Accounts. Financial detail routes remain protected. Home → Forecast, Income, Accounts, Notifications, Settings; Calendar → Day sheet → Commitment; Accounts → Account → Transactions → Transaction classification; Payments → Subscription / Income / Commitment; Settings → Security / Privacy / Support.

Motion: fast press feedback; 240 ms small entrance fade/translation; native stack push; tab fade; branded loader/skeleton opacity cycle; modal fade and handle swipe dismissal/expanded height. Reduced motion disables entrance travel, pulses, button scaling and modal animation. Native haptics support selection and connection success. No financial value is animated through invented intermediate balances.

Loading: session checks use the mark; initial financial load uses matching skeleton primitives; existing data remains during refresh; remote failure offers retry and existing workspace freshness metadata. Empty states explain a next step. Remote reads use a bounded 30-second in-memory cache and deduplicate requests; cache and result epochs prevent late responses restoring a previous session. Logout/backgrounding clear financial cache. No sensitive analytics SDK was added.

## Verification and remaining work

24 automated tests pass, including new owner-isolated preference persistence, invalid preference rejection and stale-revision checks. Both TypeScript checks, backend build and Expo lint pass. Native VoiceOver/TalkBack, physical-device haptics, 60 FPS measurements, low-end Android and iPhone testing remain unverified. Browser screenshots are review evidence, not native performance certification.

This is a reviewable development rebuild, not a consumer release. Live banking, passkeys/MFA/biometric unlock, payment execution, push delivery and production operations require providers and operational setup. Dependency audit still reports 18 High and 3 Moderate advisories. Advanced shared-element transitions, interpolated chart range morphing, production analytics, and automated screenshot regression baselines remain future work; they are not claimed as implemented.

Start with `npm run preview`. App: http://localhost:8082. API: http://localhost:4001. Nothing was committed or pushed.

Final Desktop browser evidence: registration, onboarding, consent to the explicitly synthetic bank, connection success with 3 sample accounts and 4 discovered patterns, tracking salary and Netflix, the money calendar day sheet, Home balances, and previous-day chart navigation were exercised at localhost:8082. Screenshot: ultrawork-home.png. Theme/reduced-motion native behavior, physical-device accessibility and performance are not claimed as verified.
