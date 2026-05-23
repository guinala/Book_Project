import { useContext } from "react";
import { ExploreCacheContext } from "@/context/explore_cache_init";

export function useExploreCache() {
  const ctx = useContext(ExploreCacheContext);
  if (!ctx) {
    throw new Error("useExploreCache must be used inside ExploreCacheProvider");
  }
  return ctx;
}
