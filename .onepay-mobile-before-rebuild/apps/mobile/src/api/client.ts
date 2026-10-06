import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { Tokens } from "../../../../shared/contracts";
const base = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";
if (!__DEV__ && !base.startsWith("https://"))
  throw new Error("Production API requires HTTPS");
let access: string | null = null,
  refresh: string | null = null;
let epoch = 0,
  rotating: Promise<boolean> | null = null;
const storageKey = "onepay.refresh.v1";
export class RequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public requestId?: string,
  ) {
    super(message);
  }
}
async function storeRefresh(value: string | null) {
  if (Platform.OS === "web") return;
  if (value)
    await SecureStore.setItemAsync(storageKey, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  else await SecureStore.deleteItemAsync(storageKey);
}
async function raw(path: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(`${base}/api/v1${path}`, {
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
async function responseData<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (!response.ok)
    throw new RequestError(
      data.error?.code || "REQUEST_FAILED",
      data.error?.message || "We could not complete that action.",
      data.error?.requestId,
    );
  return data as T;
}
export async function setTokens(tokens: Tokens) {
  await storeRefresh(tokens.refreshToken);
  access = tokens.accessToken;
  refresh = tokens.refreshToken;
}
export async function clearTokens() {
  epoch++;
  access = null;
  refresh = null;
  await storeRefresh(null);
}
async function rotate(): Promise<boolean> {
  if (rotating) return rotating;
  const currentEpoch = epoch;
  rotating = (async () => {
    const secret =
      refresh ||
      (Platform.OS !== "web"
        ? await SecureStore.getItemAsync(storageKey)
        : null);
    if (!secret) return false;
    const response = await raw("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: secret }),
    });
    if (!response.ok) {
      await clearTokens();
      return false;
    }
    const tokens = await responseData<Tokens>(response);
    if (currentEpoch !== epoch) return false;
    await setTokens(tokens);
    return true;
  })();
  try {
    return await rotating;
  } finally {
    rotating = null;
  }
}
export async function restoreSession() {
  return rotate();
}
export async function publicRequest<T>(path: string, body: unknown) {
  return responseData<T>(
    await raw(path, { method: "POST", body: JSON.stringify(body) }),
  );
}
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  revision?: number,
): Promise<T> {
  const currentEpoch = epoch;
  const options = () => ({
    method,
    headers: {
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...(revision !== undefined ? { "If-Match": String(revision) } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let response = await raw(path, options());
  if (response.status === 401 && (await rotate()))
    response = await raw(path, options());
  if (currentEpoch !== epoch)
    throw new RequestError("SESSION_ENDED", "Please sign in again.");
  return responseData<T>(response);
}
