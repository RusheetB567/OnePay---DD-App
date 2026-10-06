import type { Tokens } from "../../../../shared/contracts.js";
export class RequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public requestId?: string,
  ) {
    super(message);
  }
}
export interface CredentialStorage {
  load(): Promise<string | null>;
  save(value: string | null): Promise<void>;
}
const secretPattern = /^[A-Za-z0-9_-]{43}$/;
function tokenResponse(value: unknown): Tokens {
  if (!value || typeof value !== "object")
    throw new RequestError(
      "INVALID_RESPONSE",
      "The service returned an invalid session.",
    );
  const t = value as Partial<Tokens>;
  if (
    typeof t.accessToken !== "string" ||
    !secretPattern.test(t.accessToken) ||
    typeof t.refreshToken !== "string" ||
    !secretPattern.test(t.refreshToken) ||
    t.expiresIn !== 300
  )
    throw new RequestError(
      "INVALID_RESPONSE",
      "The service returned an invalid session.",
    );
  return t as Tokens;
}
export class SessionClient {
  private access: string | null = null;
  private refresh: string | null = null;
  private epoch = 0;
  private rotating: Promise<boolean> | null = null;
  private persistence: Promise<void> = Promise.resolve();
  private listeners = new Set<() => void>();
  constructor(
    private base: string,
    private storage: CredentialStorage,
    private fetcher: typeof fetch = (input, init) => fetch(input, init),
  ) {}
  onInvalidated(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private persist(value: string | null) {
    const next = this.persistence
      .catch(() => {})
      .then(() => this.storage.save(value));
    this.persistence = next;
    return next;
  }
  async setTokens(input: Tokens, expected = this.epoch) {
    const tokens = tokenResponse(input);
    if (expected !== this.epoch)
      throw new RequestError("SESSION_ENDED", "Please sign in again.");
    await this.persist(tokens.refreshToken);
    if (expected !== this.epoch)
      throw new RequestError("SESSION_ENDED", "Please sign in again.");
    this.access = tokens.accessToken;
    this.refresh = tokens.refreshToken;
  }
  async clearTokens() {
    this.epoch++;
    this.access = null;
    this.refresh = null;
    for (const listener of this.listeners) listener();
    await this.persist(null);
  }
  private async raw(
    path: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      return await this.fetcher(`${this.base}/api/v1${path}`, {
        ...options,
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...options.headers },
      });
    } catch {
      throw new RequestError(
        "NETWORK_UNAVAILABLE",
        "We could not reach OnePay. Check your connection and try again.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  private async decode<T>(response: Response): Promise<T> {
    if (response.status === 204) return undefined as T;
    let value: unknown;
    try {
      value = await response.json();
    } catch {
      throw new RequestError(
        "INVALID_RESPONSE",
        "The service returned an unreadable response.",
      );
    }
    if (!response.ok) {
      const data = value as {
        error?: { code?: string; message?: string; requestId?: string };
      } | null;
      throw new RequestError(
        data?.error?.code || "REQUEST_FAILED",
        data?.error?.message || "We could not complete that action.",
        data?.error?.requestId,
      );
    }
    return value as T;
  }
  async restoreSession() {
    return this.rotate();
  }
  private async rotate(): Promise<boolean> {
    if (this.rotating) return this.rotating;
    const current = this.epoch;
    const operation = (async () => {
      const secret = this.refresh || (await this.storage.load());
      if (current !== this.epoch || !secret) return false;
      if (!secretPattern.test(secret)) {
        await this.clearTokens();
        return false;
      }
      const response = await this.raw("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: secret }),
      });
      if (current !== this.epoch) return false;
      if (response.status === 401) {
        await this.clearTokens();
        return false;
      }
      const tokens = tokenResponse(await this.decode<unknown>(response));
      await this.setTokens(tokens, current);
      return true;
    })();
    this.rotating = operation;
    try {
      return await operation;
    } finally {
      if (this.rotating === operation) this.rotating = null;
    }
  }
  async publicRequest<T>(path: string, body: unknown) {
    const current = this.epoch;
    const result = await this.decode<T>(
      await this.raw(path, { method: "POST", body: JSON.stringify(body) }),
    );
    if (current !== this.epoch)
      throw new RequestError("SESSION_ENDED", "Please sign in again.");
    return result;
  }
  async request<T>(
    path: string,
    method = "GET",
    body?: unknown,
    revision?: number,
  ): Promise<T> {
    const current = this.epoch;
    const options = (): RequestInit => ({
      method,
      headers: {
        ...(this.access ? { Authorization: `Bearer ${this.access}` } : {}),
        ...(revision !== undefined ? { "If-Match": String(revision) } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    let response = await this.raw(path, options());
    if (current !== this.epoch)
      throw new RequestError("SESSION_ENDED", "Please sign in again.");
    if (response.status === 401 && (await this.rotate()))
      response = await this.raw(path, options());
    if (current !== this.epoch)
      throw new RequestError("SESSION_ENDED", "Please sign in again.");
    if (response.status === 401) {
      await this.clearTokens();
      throw new RequestError(
        "SESSION_ENDED",
        "Your session has ended. Please sign in again.",
      );
    }
    return this.decode<T>(response);
  }
}
