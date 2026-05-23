import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import type { ShelfEntry } from "@/services/firebase/firebaseLibrary";
import { createContext } from "react";

export type ShelfContextType = {
  shelfByStatus: Record<ShelfStatus, Book[]>;
  loading: boolean;
  addBook: (book: Book, status: ShelfStatus, opts?: { silent?: boolean }) => Promise<void>;
  removeBook: (bookKey: string, opts?: { silent?: boolean }) => Promise<void>;
  getStatus: (bookKey: string) => ShelfStatus | null;
  getEntry: (bookKey: string) => ShelfEntry | null;
  updateProgress: (
    bookKey: string,
    currentPage: number,
    opts?: {
      note?: string;
      rating?: number;
      review?: string;
      status?: ShelfStatus;
      silent?: boolean;
    }
  ) => Promise<void>;
}

export const ShelfContext = createContext<ShelfContextType | null>(null);
