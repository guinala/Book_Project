import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { createContext } from "react";

export type ShelfContextType = {
  shelfByStatus: Record<ShelfStatus, Book[]>;
  loading: boolean;
  addBook: (book: Book, status: ShelfStatus) => Promise<void>;
  removeBook: (bookKey: string) => Promise<void>;
  getStatus: (bookKey: string) => ShelfStatus | null;
}

export const ShelfContext =  createContext<ShelfContextType | null>(null);