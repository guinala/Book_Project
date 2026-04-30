import { useState, useEffect } from "react";
import { getWikipediaSummary, fetchAuthorBooks } from "@/services/api/openLibraryApi";
import { getCoverUrl } from "@/utils/coverImage";
import type { AuthorInfo } from "@/types/BookDetail";
import { getAuthorFromDB, resolveBio, saveAuthorToDB } from "@/services/firebase/firebaseAuthors";
import { getAuthorBooksFromDB, saveBooksToDB } from "@/services/firebase/firebaseBooks";
import { useTranslation } from "react-i18next";

async function fetchBioFromWikipedia(
  authorName: string,
  lang: string
): Promise<{ bio: string; photoUrl: string }> {
  const wikiData = await getWikipediaSummary(authorName, lang);
  return {
    bio: wikiData?.extract ?? '',
    photoUrl: wikiData?.thumbnail?.source ?? '',
  };
}

export function useAuthorData(authorName: string, currentBookTitle = "", authorKey?: string): {
  authorInfo: AuthorInfo | null;
  loading: boolean;
} {
  const { i18n } = useTranslation();
  const lang = i18n.language.split('-')[0];

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

      if (authorKey) {
        try {
          const dbAuthorData = await getAuthorFromDB(authorKey);
          if (dbAuthorData) {
            bio = resolveBio(dbAuthorData.bio, lang);
            photoUrl = dbAuthorData.photoUrl;
          } else {
            ({ bio, photoUrl } = await fetchBioFromWikipedia(authorName, lang));
            saveAuthorToDB(authorKey, { key: authorKey, name: authorName, bio, photoUrl }, lang);
          }
        } catch {
          ({ bio, photoUrl } = await fetchBioFromWikipedia(authorName, lang));
        }
      } else {
        ({ bio, photoUrl } = await fetchBioFromWikipedia(authorName, lang));
      }

      let books: AuthorInfo['books'] = [];

      if (authorKey) {
        try {
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
        } catch { /* Si falla Firestore o no hay suficientes libros, se llama a API */ }
      }

      if (books.length < 2) {
        try {
          const apiBooks = await fetchAuthorBooks(authorName, lang, 10);
          saveBooksToDB(apiBooks, lang); 
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
        } catch { /* si falla OpenLibrary, books queda vacío */ }
      }

      if (!cancelled) setAuthorInfo({ name: authorName, photoUrl, bio, books });
    };

    fetchAuthorData()
      .catch(() => { if (!cancelled) setAuthorInfo(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [authorName, currentBookTitle, authorKey, lang]);

  return { authorInfo, loading };
}
