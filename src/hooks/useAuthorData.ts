import { useState, useEffect } from "react";
import { getWikipediaSummary, fetchAuthorBooks, fetchWorkEditionByLang } from "@/services/api/openLibraryApi";
import { resolveCoverSrc } from "@/utils/coverImage";
import type { AuthorInfo } from "@/types/BookDetail";
import type { Book } from "@/types/Book";
import { getAuthorFromDB, resolveBio, saveAuthorToDB, updateAuthorBioToDB } from "@/services/firebase/firebaseAuthors";
import { getAuthorBooksFromDB, saveBooksToDB, updateBookTitleToDB } from "@/services/firebase/firebaseBooks";
import { logger } from "@/utils/logger";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";

async function completeAuthorBookTitles(books: Book[], lang: string): Promise<Book[]> {
  const missing = books.filter(b => !b.titles?.[lang]);
  if (missing.length === 0) return books;

  const results = await Promise.all(
    missing.map(async (book) => {
      const result = await fetchWorkEditionByLang(book.key, lang);
      if (result) {
        updateBookTitleToDB(book.key, result.title, lang, result.isbn).catch(() => {});
      }
      return { key: book.key, result };
    })
  );

  const completedMap = new Map(
    results.filter(r => r.result !== null).map(r => [r.key, r.result!])
  );

  if (completedMap.size === 0) return books;

  return books.map(book => {
    const completed = completedMap.get(book.key);
    if (!completed) return book;
    return {
      ...book,
      title: completed.title,
      titles: { ...(book.titles ?? {}), [lang]: completed.title },
      ...(completed.isbn ? { isbn: completed.isbn, isbns: { ...(book.isbns ?? {}), [lang]: completed.isbn } } : {}),
    };
  });
}

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
  const { lang } = useCurrentLanguage();

  const [authorInfo, setAuthorInfo] = useState<AuthorInfo | null>(null);
  const [loading, setLoading] = useState(!!authorName);

  useEffect(() => {
    if (!authorName) {
      return;
    }

    let cancelled = false;

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

            // Si no hay bio en el idioma actual, se intenta obtener en wikipedia
            if (!dbAuthorData.bio[lang]) {
              fetchBioFromWikipedia(authorName, lang)
                .then(({ bio: newBio }) => {
                  if (!newBio) return;
                  updateAuthorBioToDB(authorKey, newBio, lang).catch(() => {});

                  if (!cancelled) {
                    setAuthorInfo(prev => prev ? { ...prev, bio: newBio } : prev);
                  }
                })
                .catch(() => {});
            }
          } else {
            ({ bio, photoUrl } = await fetchBioFromWikipedia(authorName, lang));
            logger.log("Guardando autor")
            saveAuthorToDB(authorKey, { key: authorKey, name: authorName, bio, photoUrl }, lang).catch(() => {});
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
          const dbBooks = await getAuthorBooksFromDB(authorKey, currentBookTitle, lang);
          if (dbBooks.length >= 2) {
            books = dbBooks.slice(0, 4).map(b => ({
              id: b.key,
              cover_url: resolveCoverSrc(b) ?? '',
              title: b.title,
              year: b.first_publish_year ? String(b.first_publish_year) : '',
              rating: b.rating,
              ratingCount: b.ratingCount,
              isbn: b.isbn,
              pages: b.pages,
            }));

            // Obtener titulos faltantes en el idioma actual
            if (dbBooks.some(b => !b.titles?.[lang])) {
              completeAuthorBookTitles(dbBooks, lang)
                .then(completed => {
                  if (cancelled || completed === dbBooks) return;
                  const completedBooks = completed
                    .filter(b => b.title.toLowerCase() !== currentBookTitle.toLowerCase())
                    .slice(0, 4)
                    .map(b => ({
                      id: b.key,
                      cover_url: resolveCoverSrc(b) ?? '',
                      title: b.title,
                      year: b.first_publish_year ? String(b.first_publish_year) : '',
                      rating: b.rating,
                      ratingCount: b.ratingCount,
                      isbn: b.isbn,
                      pages: b.pages,
                    }));
                  setAuthorInfo(prev => prev ? { ...prev, books: completedBooks } : prev);
                })
                .catch(() => {});
            }
          }
        } catch { /* Si falla Firestore o no hay suficientes libros, se llama a API */ }
      }

      if (books.length < 2) {
        try {
          const apiBooks = await fetchAuthorBooks(authorName, lang, 10);
          saveBooksToDB(apiBooks, lang).catch(() => {}); 
          books = apiBooks
            .filter(b => b.cover_id !== null &&
              b.title.toLowerCase() !== currentBookTitle.toLowerCase())
            .slice(0, 4)
            .map(b => ({
              id: b.key,
              cover_url: resolveCoverSrc(b) ?? '',
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
