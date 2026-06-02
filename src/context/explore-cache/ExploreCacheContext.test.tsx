import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ExploreCacheProvider } from "./ExploreCacheContext";
import { useExploreCache } from "./useExploreCache";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ExploreCacheProvider>{children}</ExploreCacheProvider>
);

const entry = { books: [], isFallback: false };

describe("ExploreCacheContext", () => {
  it("get returns undefined for unset keys", () => {
    const { result } = renderHook(() => useExploreCache(), { wrapper });
    expect(result.current.get("missing")).toBeUndefined();
  });

  it("set then get returns the stored entry", () => {
    const { result } = renderHook(() => useExploreCache(), { wrapper });
    act(() => {
      result.current.set("k1", entry);
    });
    expect(result.current.get("k1")).toEqual(entry);
  });

  it("clearIfDirty is a no-op when dirty flag is false", () => {
    const { result } = renderHook(() => useExploreCache(), { wrapper });
    act(() => {
      result.current.set("k1", entry);
      result.current.clearIfDirty();
    });
    expect(result.current.get("k1")).toEqual(entry);
  });

  it("markDirty then clearIfDirty clears all entries", () => {
    const { result } = renderHook(() => useExploreCache(), { wrapper });
    act(() => {
      result.current.set("k1", entry);
      result.current.set("k2", entry);
      result.current.markDirty();
      result.current.clearIfDirty();
    });
    expect(result.current.get("k1")).toBeUndefined();
    expect(result.current.get("k2")).toBeUndefined();
  });

  it("clearIfDirty resets dirty flag so subsequent calls are no-ops", () => {
    const { result } = renderHook(() => useExploreCache(), { wrapper });
    act(() => {
      result.current.markDirty();
      result.current.clearIfDirty();
      result.current.set("k1", entry);
      result.current.clearIfDirty();
    });
    expect(result.current.get("k1")).toEqual(entry);
  });

  it("useExploreCache throws when used without a provider", () => {
    expect(() => renderHook(() => useExploreCache())).toThrow(
      /ExploreCacheProvider/,
    );
  });

  it("getFeed returns undefined for unset keys", () => {
    const { result } = renderHook(() => useExploreCache(), { wrapper });
    expect(result.current.getFeed("missing")).toBeUndefined();
  });

  it("setFeed then getFeed returns the stored entries", () => {
    const { result } = renderHook(() => useExploreCache(), { wrapper });
    const feedEntries = [
      { id: "s1", type: "trending" as const, books: [], isFallback: false },
    ];
    act(() => {
      result.current.setFeed("feed:key1", feedEntries);
    });
    expect(result.current.getFeed("feed:key1")).toEqual(feedEntries);
  });

  it("clearIfDirty clears both section and feed caches", () => {
    const { result } = renderHook(() => useExploreCache(), { wrapper });
    const feedEntries = [
      { id: "s1", type: "trending" as const, books: [], isFallback: false },
    ];
    act(() => {
      result.current.set("k1", entry);
      result.current.setFeed("feed:key1", feedEntries);
      result.current.markDirty();
      result.current.clearIfDirty();
    });
    expect(result.current.get("k1")).toBeUndefined();
    expect(result.current.getFeed("feed:key1")).toBeUndefined();
  });
});
