import { useEffect, useState } from "react";
import { request, onSessionInvalidated } from "./client";
type Entry = { value: unknown; at: number };
const cache = new Map<string, Entry>();
const pending = new Map<string, Promise<unknown>>();
let generation = 0;
export function clearRemoteCache() {
  generation++;
  cache.clear();
  pending.clear();
}
onSessionInvalidated(clearRemoteCache);
export function useRemote<T>(path: string | null, version: string | undefined) {
  const [attempt, setAttempt] = useState(0),
    key = `${path}:${version}:${attempt}`;
  const [result, setResult] = useState<{
    epoch: number;
    key: string;
    path: string;
    value?: T;
    error?: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    const epoch = generation;
    if (!path) return;
    const cacheKey = `${path}:${version}`,
      saved = cache.get(cacheKey);
    const fresh = !attempt && saved && Date.now() - saved.at < 30000;
    let promise = fresh ? Promise.resolve(saved.value) : pending.get(cacheKey);
    if (!promise) {
      promise = request<T>(path);
      pending.set(cacheKey, promise);
    }
    void promise
      .then((value) => {
        if (epoch !== generation) return;
        if (cache.size >= 50) cache.delete(cache.keys().next().value!);
        if (!fresh) cache.set(cacheKey, { value, at: Date.now() });
        if (active) setResult({ epoch, key, path, value: value as T });
      })
      .catch((error) => {
        if (active && epoch === generation)
          setResult((old) => ({
            epoch,
            key,
            path,
            value:
              old?.path === path && old.epoch === epoch ? old.value : undefined,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load information.",
          }));
      })
      .finally(() => {
        if (pending.get(cacheKey) === promise) pending.delete(cacheKey);
      });
    return () => {
      active = false;
    };
  }, [path, key, attempt, version]);
  const current =
    path && result?.path === path && result.epoch === generation
      ? result
      : null;
  return {
    value: current?.value,
    error: current?.key === key ? current.error : undefined,
    loading: !!path && current?.key !== key,
    retry: () => setAttempt((v) => v + 1),
  };
}
