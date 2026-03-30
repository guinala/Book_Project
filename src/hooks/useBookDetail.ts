import type { BookDetail } from "@/types/BookDetail";
import { getBookDetailById } from "@/data/bookDetailData";

//Pendiente de hacer funcionar con Firebase
export function useBookDetail(id: string): {
  book: BookDetail | null;
  loading: boolean;
  error: string | null;
} {
  const book = getBookDetailById(decodeURIComponent(id));
  return {
    book,
    loading: false,
    error: book ? null : "Libro no encontrado",
  };
}
