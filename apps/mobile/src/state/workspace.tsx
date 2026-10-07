import { clearRemoteCache } from "../api/use-remote";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import type { Bootstrap, Tokens } from "../../../../shared/contracts";
import {
  clearTokens,
  onSessionInvalidated,
  publicRequest,
  request,
  RequestError,
  restoreSession,
  setTokens,
} from "../api/client";
interface WorkspaceContext {
  data: Bootstrap | null;
  signedIn: boolean;
  hideAmounts: boolean;
  toggleAmounts: () => void;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  login: (email: string, password: string, name?: string) => Promise<void>;
  logout: (all?: boolean) => Promise<void>;
  mutate: <T>(path: string, method: string, body?: unknown) => Promise<T>;
}
const Context = createContext<WorkspaceContext | null>(null);
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Bootstrap | null>(null),
    [signedIn, setSignedIn] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const [hideAmounts, setHideAmounts] = useState(false);
  const savedPrivacy = useRef<boolean | undefined>(undefined);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const authenticated = useRef(false);
  const reload = useCallback(async () => {
    const current = generation.current;
    setLoading(true);
    setError(null);
    try {
      const next = await request<Bootstrap>("/bootstrap");
      if (current === generation.current) {
        if (
          !authenticated.current ||
          savedPrivacy.current !== (next.profile.hideAmounts ?? false)
        )
          setHideAmounts(next.profile.hideAmounts ?? false);
        savedPrivacy.current = next.profile.hideAmounts ?? false;
        setData(next);
        setSignedIn(true);
        authenticated.current = true;
      }
    } catch (e) {
      if (current !== generation.current) return;
      const issue =
        e instanceof Error ? e.message : "Unable to refresh your workspace.";
      setError(issue);
      if (
        e instanceof RequestError &&
        ["SESSION_REQUIRED", "SESSION_EXPIRED", "SESSION_ENDED"].includes(
          e.code,
        )
      ) {
        authenticated.current = false;
        setSignedIn(false);
        setData(null);
        await clearTokens();
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);
  useEffect(
    () =>
      onSessionInvalidated(() => {
        generation.current++;
        authenticated.current = false;
        setData(null);
        setSignedIn(false);
        setLoading(false);
        setError("Your session has ended. Please sign in again.");
      }),
    [],
  );
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (await restoreSession()) {
          if (active) await reload();
        } else if (active) setLoading(false);
      } catch {
        if (active) {
          setError("Could not restore your session. Sign in to continue.");
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [reload]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (value) => {
      if (value !== "active") {
        generation.current++;
        clearRemoteCache();
        setData(null);
      } else if (authenticated.current) void reload();
    });
    return () => subscription.remove();
  }, [reload]);
  const login = async (email: string, password: string, name?: string) => {
    clearRemoteCache();
    setError(null);
    const tokens = await publicRequest<Tokens>(
      name ? "/auth/register" : "/auth/login",
      {
        email: email.trim().toLowerCase(),
        password,
        device: "OnePay mobile/web development",
        ...(name ? { name } : {}),
      },
    );
    await setTokens(tokens);
    await reload();
  };
  const logout = async (all = false) => {
    try {
      await request(all ? "/logout-all" : "/logout", "POST", {});
    } finally {
      generation.current++;
      authenticated.current = false;
      setData(null);
      setSignedIn(false);
      setError(null);
      await clearTokens();
    }
  };
  const mutate = async <T,>(
    path: string,
    method: string,
    body?: unknown,
  ): Promise<T> => {
    if (!data) throw new Error("Refresh your workspace first.");
    if (inFlight.current)
      throw new Error("Please wait for the current action to finish.");
    inFlight.current = true;
    try {
      const result = await request<T>(path, method, body, data.revision);
      await reload();
      return result;
    } catch (e) {
      if (e instanceof RequestError && e.code === "STALE_REVISION")
        await reload();
      throw e;
    } finally {
      inFlight.current = false;
    }
  };
  return (
    <Context.Provider
      value={{
        data,
        signedIn,
        loading,
        error,
        reload,
        login,
        logout,
        mutate,
        hideAmounts,
        toggleAmounts: () => {
          const next = !hideAmounts;
          setHideAmounts(next);
          if (data)
            void mutate("/profile", "PATCH", {
              ...data.profile,
              hideAmounts: next,
            }).catch(() =>
              setError(
                "Privacy is applied here, but could not be saved. Try again after refreshing.",
              ),
            );
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("Workspace context unavailable");
  return ctx;
}
