import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import type { ShelfEntry } from "@/services/firebase/firebase_library";
import { createContext } from "react";

export type ShelfContextType = {
  shelfByStatus: Record<ShelfStatus, Book[]>;
  loading: boolean;
  addBook: (book: Book, status: ShelfStatus) => Promise<void>;
  removeBook: (bookKey: string) => Promise<void>;
  getStatus: (bookKey: string) => ShelfStatus | null;
  getEntry: (bookKey: string) => ShelfEntry | null;
  updateProgress: (bookKey: string, currentPage: number, note?: string) => Promise<void>;
}

export const ShelfContext = createContext<ShelfContextType | null>(null);
