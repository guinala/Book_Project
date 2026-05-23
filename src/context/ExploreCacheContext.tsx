import { useCallback, useMemo, useRef } from "react";
import { ExploreCacheContext, type ExploreCacheEntry } from "./explore_cache_init";

export function ExploreCacheProvider({ children }: { children: React.ReactNode }) {
  const cacheRef = useRef<Map<string, ExploreCacheEntry>>(new Map());
  const dirtyRef = useRef(false);

  const get = useCallback(
    (key: string) => cacheRef.current.get(key),
    [],
  );

  const set = useCallback((key: string, entry: ExploreCacheEntry) => {
    cacheRef.current.set(key, entry);
  }, []);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  const clearIfDirty = useCallback(() => {
    if (dirtyRef.current) {
      cacheRef.current.clear();
      dirtyRef.current = false;
    }
  }, []);

  const value = useMemo(
    () => ({ get, set, markDirty, clearIfDirty }),
    [get, set, markDirty, clearIfDirty],
  );

  return (
    <ExploreCacheContext.Provider value={value}>
      {children}
    </ExploreCacheContext.Provider>
  );
}
