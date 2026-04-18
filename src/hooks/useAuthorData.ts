import { useState, useEffect } from "react";
import { getWikipediaSummary, fetchAuthorBooks } from "@/services/api/openLibraryApi";
import { getCoverUrl } from "@/utils/coverImage";
import type { AuthorInfo } from "@/types/BookDetail";
import { getAuthorFromDB, saveAuthorToDB } from "@/services/firebase/firebase_authors";
import { getAuthorBooksFromDB } from "@/services/firebase/firebase_books";

export function useAuthorData(authorName: string, currentBookTitle = "", authorKey?: string): {
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

    // Promise.all([
    //   getWikipediaSummary(authorName),
    //   fetchAuthorBooks(authorName, 'es', 10),
    // ])
    //   .then(([wiki, books]) => {
    //     if (cancelled) return;

    //     const filteredBooks = books
    //       .filter(b => b.cover_id !== null &&
    //         b.title.toLowerCase() !== currentBookTitle.toLowerCase())
    //       .slice(0, 4)
    //       .map(b => ({
    //         id: b.key,
    //         cover_url: getCoverUrl(b.cover_id!),
    //         title: b.title,
    //         year: b.first_publish_year ? String(b.first_publish_year) : '',
    //         rating: b.rating,
    //         ratingCount: b.ratingCount,
    //         isbn: b.isbn,
    //         pages: b.pages,
    //       }));


    //     setAuthorInfo({
    //       name: authorName,
    //       photoUrl: wiki?.thumbnail?.source ?? '',
    //       bio: wiki?.extract ?? '',
    //       books: filteredBooks,
    //     });
    //   })
    const fetchAuthorData = async () => {
      //Biografia y foto
      let bio = '';
      let photoUrl = '';

      if(authorKey) {
        const cached = await getAuthorFromDB(authorKey);

        if(cached) {
          bio = cached.bio;
          photoUrl = cached.photoUrl;
        } else {
          const wikiData = await getWikipediaSummary(authorName);
          bio = wikiData?.extract ?? '';
          photoUrl = wikiData?.thumbnail?.source ?? '';
          saveAuthorToDB(authorKey, { key: authorKey, name: authorName, bio, photoUrl });
        }
      } else {
        const wikiData = await getWikipediaSummary(authorName);
        bio = wikiData?.extract ?? '';
        photoUrl = wikiData?.thumbnail?.source ?? '';
      }

      // Libros del autor 
      let books: AuthorInfo['books'] = [];

      if (authorKey) {
        //Firebase
        const dbBooks = await getAuthorBooksFromDB(authorKey, currentBookTitle);
        if (dbBooks.length >= 2) {
          books = dbBooks.slice(0, 4).map(b => ({
            id: b.key,
            cover_url: b.cover_url ?? (b.cover_id ? getCoverUrl(b.cover_id) : ''),
            title: b.title,
            year: b.first_publish_year ? String(b.first_publish_year) : '',
            rating: b.rating,
            ratingCount: b.ratingCount,
            isbn: b.isbn,
            pages: b.pages,
          }));
        }
      }

      if (books.length < 2) {
        //Fallback API
        const apiBooks = await fetchAuthorBooks(authorName, 'es', 10);
        books = apiBooks
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
      }

      if(!cancelled) setAuthorInfo({ name: authorName, photoUrl, bio, books});
    };

    fetchAuthorData()
      .catch(() => { if (!cancelled) setAuthorInfo(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [authorName, currentBookTitle, authorKey]);

  return { authorInfo, loading };
}
