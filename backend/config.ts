import { z } from "zod";
const configuration = z.object({
  NODE_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
  API_PORT: z.coerce.number().int().min(1024).max(65535).default(4000),
  DATABASE_URL: z.string().url().optional(),
  DATABASE_TLS: z.enum(["required", "local"]).default("required"),
  BANKING_PROVIDER: z.enum(["synthetic", "unavailable"]).default("synthetic"),
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:8081,http://localhost:8082"),
  OIDC_ISSUER: z.url().optional(),
  OIDC_AUDIENCE: z.string().min(1).optional(),
  OIDC_JWKS_URL: z.url().optional(),
});
export function loadConfig(env: NodeJS.ProcessEnv) {
  const c = configuration.parse(env);
  const oidc = [c.OIDC_ISSUER, c.OIDC_AUDIENCE, c.OIDC_JWKS_URL].filter(
    Boolean,
  );
  if (oidc.length && oidc.length !== 3)
    throw new Error("All OIDC settings must be configured together.");
  const origins = c.ALLOWED_ORIGINS.split(",");
  for (const origin of origins) {
    const url = new URL(origin);
    if (url.origin !== origin)
      throw new Error("Origins must be exact scheme/host/port values.");
  }
  if (["staging", "production"].includes(c.NODE_ENV))
    throw new Error(
      "Release gate: production identity, banking, database security, mobile security and operational evidence are not verified. See docs/SECURITY-VERIFICATION.md.",
    );
  return { ...c, origins };
}
