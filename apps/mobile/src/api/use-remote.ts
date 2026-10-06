import { useEffect, useState } from "react";
import { request } from "./client";
export function useRemote<T>(path: string | null, version: string | undefined) {
  const [attempt, setAttempt] = useState(0);
  const key = `${path}:${version}:${attempt}`;
  const [result, setResult] = useState<{
    key: string;
    value?: T;
    error?: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    if (path)
      void request<T>(path)
        .then((value) => {
          if (active) setResult({ key, value });
        })
        .catch((error) => {
          if (active)
            setResult({
              key,
              error:
                error instanceof Error
                  ? error.message
                  : "Unable to load information.",
            });
        });
    return () => {
      active = false;
    };
  }, [path, key]);
  const current = result?.key === key ? result : null;
  return {
    value: current?.value,
    error: current?.error,
    loading: !!path && !current,
    retry: () => setAttempt((v) => v + 1),
  };
}
