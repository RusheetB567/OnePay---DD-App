import { createRemoteJWKSet, jwtVerify } from "jose";
export interface Identity {
  subject: string;
  email: string;
  verified: boolean;
  authenticatedAt: number;
}
export interface IdentityProvider {
  verify(token: string): Promise<Identity>;
}
export class OidcIdentityProvider implements IdentityProvider {
  private keys: ReturnType<typeof createRemoteJWKSet>;
  constructor(
    private issuer: string,
    private audience: string,
    jwksUrl: string,
  ) {
    if (!issuer.startsWith("https://") || !jwksUrl.startsWith("https://"))
      throw new Error("Identity provider must use HTTPS");
    this.keys = createRemoteJWKSet(new URL(jwksUrl));
  }
  async verify(token: string) {
    const { payload } = await jwtVerify(token, this.keys, {
      issuer: this.issuer,
      audience: this.audience,
      algorithms: ["RS256", "ES256"],
      maxTokenAge: "5m",
    });
    if (
      !payload.sub ||
      typeof payload.email !== "string" ||
      payload.email_verified !== true ||
      typeof payload.auth_time !== "number"
    )
      throw new Error("Verified identity required");
    return {
      subject: `${this.issuer}|${payload.sub}`,
      email: payload.email.toLowerCase(),
      verified: true,
      authenticatedAt: payload.auth_time * 1000,
    };
  }
}
