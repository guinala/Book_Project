import { useCallback, useMemo, useRef } from "react";
import { ExploreCacheContext, type ExploreCacheEntry } from "./explore_cache_init";
import type { SectionEntry } from "@/pages/explore/hooks/useExploreFeed";

export function ExploreCacheProvider({ children }: { children: React.ReactNode }) {
  const sectionCacheRef = useRef<Map<string, ExploreCacheEntry>>(new Map());
  const feedCacheRef = useRef<Map<string, SectionEntry[]>>(new Map());
  const dirtyRef = useRef(false);

  const get = useCallback(
    (key: string) => sectionCacheRef.current.get(key),
    [],
  );

  const set = useCallback((key: string, entry: ExploreCacheEntry) => {
    sectionCacheRef.current.set(key, entry);
  }, []);

  const getFeed = useCallback(
    (key: string) => feedCacheRef.current.get(key),
    [],
  );

  const setFeed = useCallback((key: string, entries: SectionEntry[]) => {
    feedCacheRef.current.set(key, entries);
  }, []);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  const clearIfDirty = useCallback(() => {
    if (dirtyRef.current) {
      sectionCacheRef.current.clear();
      feedCacheRef.current.clear();
      dirtyRef.current = false;
    }
  }, []);

  const value = useMemo(
    () => ({ get, set, getFeed, setFeed, markDirty, clearIfDirty }),
    [get, set, getFeed, setFeed, markDirty, clearIfDirty],
  );

  return (
    <ExploreCacheContext.Provider value={value}>
      {children}
    </ExploreCacheContext.Provider>
  );
}
