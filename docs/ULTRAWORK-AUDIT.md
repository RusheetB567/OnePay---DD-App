# OnePay frontend audit — before implementation

Keep: Expo Router protected routes, strict shared contracts, API ownership/revision controls, integer financial calculations, native secure token storage, transient sensitive data and provider gates.

Improve: all 23 existing screens inherit the same rudimentary Screen/Card/Button system. Account, transaction, commitment and notification detail actions already work. Preserve these integrations while improving density, focus, hierarchy and feedback.

Rebuild: green palette, text-glyph tabs, spinner launch, oversized sequential Home cards, unvisualised forecast, ungrouped transaction feed, calendar day interaction and undifferentiated empty states. Add a common vector identity, accessible motion, branded skeletons, interactive forecast and compact timeline.

Remove: duplicate navigation glyphs, blank async content, button labels disappearing while pending, technical detail from primary financial surfaces. Keep synthetic-provider and prediction disclosures visible.

Inventory: welcome; onboarding; five tabs (Home, Calendar, Payments, Insights, Accounts); account; connect; commitment; transactions; transaction; forecast; subscriptions; income; notifications; security; privacy; settings; support. All use authenticated server state except welcome. Only sample banking is available. No real payments, biometric identity or recovery may be implied.

Order: tokens → motion/icons/states → shared controls → navigation/auth → Home/forecast → calendar/day sheet → account/feed/insights → remaining route states → checks/browser review → Desktop sync.

Native motion performance, VoiceOver/TalkBack and real providers require physical devices/provider setup. Browser evidence cannot certify native performance.
