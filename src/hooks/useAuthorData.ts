import { useState, useEffect } from "react";
import { getWikipediaSummary, fetchAuthorBooks } from "@/services/api/openLibraryApi";
import { getCoverUrl } from "@/utils/coverImage";
import type { AuthorInfo } from "@/types/BookDetail";

export function useAuthorData(authorName: string, currentBookTitle = ""): {
  authorInfo: AuthorInfo | null;
  loading: boolean;
} {
  const [authorInfo, setAuthorInfo] = useState<AuthorInfo | null>(null);
  const [loading, setLoading] = useState(!!authorName);

  useEffect(() => {
    if (!authorName) {
      return;
    }

    let cancelled = false;

    Promise.all([
      getWikipediaSummary(authorName),
      fetchAuthorBooks(authorName, 'es', 10),
    ])
      .then(([wiki, books]) => {
        if (cancelled) return;

        const filteredBooks = books
          .filter(b => b.cover_id !== null &&
            b.title.toLowerCase() !== currentBookTitle.toLowerCase())
          .slice(0, 4)
          .map(b => ({
            id: b.key,
            cover_url: getCoverUrl(b.cover_id!),
            title: b.title,
            year: b.first_publish_year ? String(b.first_publish_year) : '',
            rating: b.rating,
            ratingCount: b.ratingCount,
            isbn: b.isbn,
            pages: b.pages,
          }));


        setAuthorInfo({
          name: authorName,
          photoUrl: wiki?.thumbnail?.source ?? '',
          bio: wiki?.extract ?? '',
          books: filteredBooks,
        });
      })
      .catch(() => { if (!cancelled) setAuthorInfo(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [authorName, currentBookTitle]);

  return { authorInfo, loading };
}
