import { createContext } from "react";
import type { Book } from "@/types/Book";

export type ExploreCacheEntry = {
  books: Book[];
  isFallback: boolean;
};

export type ExploreCacheContextValue = {
  get: (key: string) => ExploreCacheEntry | undefined;
  set: (key: string, entry: ExploreCacheEntry) => void;
  markDirty: () => void;
  clearIfDirty: () => void;
};

export const ExploreCacheContext = createContext<ExploreCacheContextValue | null>(null);
