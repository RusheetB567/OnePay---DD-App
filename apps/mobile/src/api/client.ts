import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { SessionClient } from "./session-client";
export { RequestError } from "./session-client";
const base = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";
const url = new URL(base);
if (
  url.username ||
  url.password ||
  url.search ||
  url.hash ||
  url.pathname !== "/" ||
  (!__DEV__ && url.protocol !== "https:") ||
  (__DEV__ && !["https:", "http:"].includes(url.protocol))
)
  throw new Error("Configure a valid API origin; production requires HTTPS.");
const key = "onepay.refresh.v1";
const client = new SessionClient(url.origin, {
  load: () =>
    Platform.OS === "web"
      ? Promise.resolve(null)
      : SecureStore.getItemAsync(key),
  async save(value) {
    if (Platform.OS === "web") return;
    if (value)
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    else await SecureStore.deleteItemAsync(key);
  },
});
export const setTokens = client.setTokens.bind(client);
export const clearTokens = client.clearTokens.bind(client);
export const restoreSession = client.restoreSession.bind(client);
export const publicRequest = client.publicRequest.bind(client);
export const request = client.request.bind(client);
export const onSessionInvalidated = client.onInvalidated.bind(client);
