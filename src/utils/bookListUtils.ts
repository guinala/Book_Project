import type { Book } from "@/types/Book";
import type { ListBook } from "@/types/BookList";

export const MAX_LIST_BOOKS = 100;

export function getListCoverUrls(books: ListBook[]): string[] {
    return books
        .map((b) => b.cover_url)
        .filter((url): url is string => !!url)
        .slice(0, 4);
}

export function isValidListName(name: string): boolean {
    return name.trim().length > 0;
}

export function listBookToBook(lb: ListBook): Book {
    return {
        key: lb.key,
        title: lb.title,
        authors: lb.authors,
        cover_url: lb.cover_url,
        first_publish_year: 0,
        cover_id: null,
        edition_count: 0,
    }
}