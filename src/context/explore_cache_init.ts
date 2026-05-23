import { createContext } from "react";
import type { Book } from "@/types/Book";
import type { SectionEntry } from "@/hooks/useExploreFeed";

export type ExploreCacheEntry = {
  books: Book[];
  isFallback: boolean;
};

export type ExploreCacheContextValue = {
  get: (key: string) => ExploreCacheEntry | undefined;
  set: (key: string, entry: ExploreCacheEntry) => void;
  getFeed: (key: string) => SectionEntry[] | undefined;
  setFeed: (key: string, entries: SectionEntry[]) => void;
  markDirty: () => void;
  clearIfDirty: () => void;
};

export const ExploreCacheContext = createContext<ExploreCacheContextValue | null>(null);
