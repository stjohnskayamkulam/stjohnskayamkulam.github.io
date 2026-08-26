import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
  /** Applies a local change without a round trip, e.g. after a like toggle. */
  setData: (updater: T | ((current: T | null) => T | null)) => void;
}

interface Snapshot<T> {
  /** Identifies which dependency set produced this result. */
  key: string;
  data: T | null;
  error: Error | null;
  settled: boolean;
}

/**
 * Runs an async loader and tracks its state.
 *
 * Loading is *derived* by comparing the current dependency key against the key
 * of the last settled result, rather than being set from inside the effect.
 * That keeps the transition to a new query render-only, and means results from
 * superseded calls are discarded instead of overwriting fresher data.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: unknown[],
): AsyncState<T> {
  const [nonce, setNonce] = useState(0);
  const key = `${JSON.stringify(deps)}::${nonce}`;

  const [snapshot, setSnapshot] = useState<Snapshot<T>>({
    key,
    data: null,
    error: null,
    settled: false,
  });

  // Callers pass inline closures, so the loader identity changes every render;
  // `deps` is the explicit invalidation key instead.
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let active = true;

    loaderRef
      .current()
      .then((data) => {
        if (active) setSnapshot({ key, data, error: null, settled: true });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setSnapshot({
          key,
          data: null,
          error: err instanceof Error ? err : new Error(String(err)),
          settled: true,
        });
      });

    return () => {
      active = false;
    };
  }, [key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const setData = useCallback(
    (updater: T | ((current: T | null) => T | null)) => {
      setSnapshot((current) => ({
        ...current,
        data:
          typeof updater === "function"
            ? (updater as (c: T | null) => T | null)(current.data)
            : updater,
      }));
    },
    [],
  );

  const isCurrent = snapshot.key === key;

  return {
    data: isCurrent ? snapshot.data : null,
    loading: !isCurrent || !snapshot.settled,
    error: isCurrent ? snapshot.error : null,
    reload,
    setData,
  };
}
