import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hash, verify, argon2id } from "argon2";
import type { Tokens } from "../shared/contracts.js";
import { ApiError } from "./errors.js";
import {
  audit,
  newWorkspace,
  type Store,
  type StoredSession,
  type UserRecord,
} from "./store.js";
export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("base64url");
export class AuthService {
  constructor(
    private store: Store,
    private now: () => number,
  ) {}
  async register(
    input: { email: string; password: string; name: string; device: string },
    requestId: string,
  ): Promise<Tokens> {
    if (await this.store.findEmail(input.email))
      throw new ApiError(
        400,
        "REGISTRATION_FAILED",
        "Unable to register with those details.",
      );
    const passwordHash = await hash(input.password, {
      type: argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
    const user: UserRecord = {
      id: randomUUID(),
      email: input.email,
      passwordHash,
      externalSubject: null,
      workspace: newWorkspace(input.name),
      sessions: [],
      audit: [],
    };
    try {
      await this.store.create(user);
    } catch {
      throw new ApiError(
        400,
        "REGISTRATION_FAILED",
        "Unable to register with those details.",
      );
    }
    return this.issue(user.id, input.device, requestId, "USER_REGISTERED");
  }
  async login(
    input: { email: string; password: string; device: string },
    requestId: string,
  ): Promise<Tokens> {
    const user = await this.store.findEmail(input.email);
    // Perform the same expensive KDF for unknown users; no account-existence response.
    const matches = user?.passwordHash
      ? await verify(user.passwordHash, input.password)
      : await hash(input.password, {
          type: argon2id,
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 1,
        }).then(() => false);
    if (!user || !matches) {
      if (user)
        await this.store.mutateSecurity(user.id, (u) =>
          audit(
            u,
            "USER_LOGIN_FAILED",
            requestId,
            new Date(this.now()).toISOString(),
          ),
        );
      throw new ApiError(
        401,
        "INVALID_CREDENTIALS",
        "Email or password was not recognised.",
      );
    }
    return this.issue(user.id, input.device, requestId, "USER_LOGIN_SUCCEEDED");
  }
  async issue(
    id: string,
    device: string,
    requestId: string,
    action: string,
    authenticatedAt = this.now(),
  ): Promise<Tokens> {
    const accessToken = token(),
      refreshToken = token(),
      now = this.now();
    await this.store.mutateSecurity(id, (u) => {
      const active = u.sessions.filter((s) => !s.revoked && s.expiresAt > now);
      if (active.length >= 10) {
        active.sort((a, b) => a.createdAt - b.createdAt)[0]!.revoked = true;
      }
      u.sessions.push({
        id: randomUUID(),
        device,
        accessHash: tokenHash(accessToken),
        refreshHash: tokenHash(refreshToken),
        usedRefreshHashes: [],
        accessExpires: now + 300000,
        expiresAt: now + 86400000,
        createdAt: now,
        lastSeen: now,
        authenticatedAt,
        revoked: false,
      });
      audit(u, action, requestId, new Date(now).toISOString());
    });
    return { accessToken, refreshToken, expiresIn: 300 };
  }
  async authenticate(
    accessToken: string,
  ): Promise<{ userId: string; sessionId: string }> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(accessToken))
      throw new ApiError(401, "SESSION_REQUIRED", "Please sign in again.");
    const digest = tokenHash(accessToken);
    const record = await this.store.findToken(digest, "access");
    if (!record)
      throw new ApiError(401, "SESSION_REQUIRED", "Please sign in again.");
    const result = await this.store.mutateSecurity(record.id, (u) => {
      const session = u.sessions.find((s) => s.accessHash === digest);
      const now = this.now();
      if (
        !session ||
        session.revoked ||
        session.accessExpires <= now ||
        session.expiresAt <= now ||
        session.lastSeen + 1800000 <= now
      )
        return null;
      session.lastSeen = now;
      return { userId: u.id, sessionId: session.id };
    });
    if (!result)
      throw new ApiError(
        401,
        "SESSION_EXPIRED",
        "Your session has ended. Please sign in again.",
      );
    return result;
  }
  async refresh(refreshToken: string, requestId: string): Promise<Tokens> {
    const digest = tokenHash(refreshToken);
    const user = await this.store.findToken(digest, "refresh");
    if (!user)
      throw new ApiError(401, "SESSION_EXPIRED", "Please sign in again.");
    const result = await this.store.mutateSecurity(user.id, (u) => {
      const reused = u.sessions.find((s) =>
        s.usedRefreshHashes.includes(digest),
      );
      if (reused) {
        reused.revoked = true;
        audit(
          u,
          "REFRESH_TOKEN_REUSE_BLOCKED",
          requestId,
          new Date(this.now()).toISOString(),
        );
        return null;
      }
      const session = u.sessions.find((s) => s.refreshHash === digest);
      const now = this.now();
      if (
        !session ||
        session.revoked ||
        session.expiresAt <= now ||
        session.lastSeen + 1800000 <= now
      )
        return null;
      const accessToken = token(),
        nextRefresh = token();
      session.usedRefreshHashes.push(session.refreshHash);
      session.refreshHash = tokenHash(nextRefresh);
      session.accessHash = tokenHash(accessToken);
      session.accessExpires = now + 300000;
      session.lastSeen = now;
      return { accessToken, refreshToken: nextRefresh, expiresIn: 300 };
    });
    if (!result)
      throw new ApiError(
        401,
        "SESSION_EXPIRED",
        "Your session has ended. Please sign in again.",
      );
    return result;
  }
  requireSession(user: UserRecord, sessionId: string): StoredSession {
    const session = user.sessions.find((s) => s.id === sessionId);
    const now = this.now();
    if (
      !session ||
      session.revoked ||
      session.accessExpires <= now ||
      session.expiresAt <= now
    )
      throw new ApiError(401, "SESSION_EXPIRED", "Please sign in again.");
    return session;
  }
  requireRecent(user: UserRecord, sessionId: string): void {
    if (
      this.requireSession(user, sessionId).authenticatedAt + 300000 <=
      this.now()
    )
      throw new ApiError(
        403,
        "STEP_UP_REQUIRED",
        "Please sign in again before this sensitive action.",
      );
  }
}
