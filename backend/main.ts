import { createApp } from "./app.js";
import { MemoryStore, PostgresStore } from "./store.js";
import {
  SyntheticBankingProvider,
  UnavailableBankingProvider,
} from "./providers/banking.js";
import { OidcIdentityProvider } from "./providers/identity.js";
import { loadConfig } from "./config.js";
import { JsonObserver } from "./observability.js";
const config = loadConfig(process.env);
const mode = "development";
const store = config.DATABASE_URL
  ? new PostgresStore(config.DATABASE_URL, config.DATABASE_TLS === "required")
  : new MemoryStore();
const identity =
  config.OIDC_ISSUER && config.OIDC_AUDIENCE && config.OIDC_JWKS_URL
    ? new OidcIdentityProvider(
        config.OIDC_ISSUER,
        config.OIDC_AUDIENCE,
        config.OIDC_JWKS_URL,
      )
    : undefined;
const app = createApp({
  store,
  banking:
    config.BANKING_PROVIDER === "unavailable"
      ? new UnavailableBankingProvider()
      : new SyntheticBankingProvider(),
  mode,
  identity,
  origins: config.origins,
  observer: new JsonObserver(),
});
const server = app.listen(config.API_PORT, "127.0.0.1", () =>
  console.log(
    `OnePay development API: http://localhost:${config.API_PORT} (synthetic data only)`,
  ),
);
function shutdown() {
  server.close(() => void store.close());
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
