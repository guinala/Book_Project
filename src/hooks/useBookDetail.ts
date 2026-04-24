import type { BookDetail } from "@/types/BookDetail";
import type { Book } from "@/types/Book";
import { getBookDetailById } from "@/data/bookDetailData";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useLocation } from "react-router";
// import { extractSynopsis, getWork } from "@/services/api/openLibraryApi";  
import { getCoverUrl } from "@/utils/coverImage";
import { fetchGoogleSynopsis } from "@/services/api/googleBooksApi";
import { getSynopsisFromDB, saveSynopsisToDB } from "@/services/firebase/firebase_books";

export function useBookDetail(id: string): {
  book: BookDetail | null;
  loading: boolean;
  error: string | null;
} {
  const { t } = useTranslation();
  const location = useLocation();
  const bookFromState: Book | undefined = location.state?.book;
  console.log('location.state:', location.state);
  console.log('bookFromState:', bookFromState);


  const decodedId = decodeURIComponent(id);
  const isAPIKey = decodedId.startsWith('/works/');

  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(isAPIKey);
  const [error, setError] = useState<string | null>(null);

  // useEffect(() => {
  //   if (!isAPIKey) return;

  //   let cancelled = false;
  //   const controller = new AbortController();

  //   fetchGoogleSynopsis(
  //     bookFromState?.title ?? decodedId,
  //     controller.signal,
  //     bookFromState?.isbn,
  //     bookFromState?.authors?.[0],
  //   ).then(synopsis => {
  //       console.log('isbn enviado:', bookFromState?.isbn);
  //       console.log('título enviado:', bookFromState?.title);
  //       console.log('synopsis recibida:', synopsis);
  //       if (cancelled) return;
  //       const fallback = getBookDetailById(decodedId);
  //       setBook({
  //         key: decodedId,
  //         cover_url: bookFromState?.cover_url ?? (bookFromState?.cover_id ? getCoverUrl(bookFromState.cover_id) : ''),
  //         genre: bookFromState?.genre ?? '',
  //         title: bookFromState?.title ?? '',
  //         author: bookFromState?.authors?.[0] ?? '',
  //         rating: bookFromState?.rating ?? 0,
  //         reviewCount: bookFromState?.ratingCount ?? 0,
  //         pages: bookFromState?.pages ?? 0,
  //         year: bookFromState?.first_publish_year ?? 0,
  //         isbn: bookFromState?.isbn ?? '',
  //         synopsis,
  //         reviews: fallback?.reviews ?? [],
  //         authorInfo: fallback?.authorInfo ?? { name: '', photoUrl: '', bio: '', books: [] },
  //         recommendations: fallback?.recommendations ?? [],
  //       });
  //     })
  //     .catch(err => {
  //       if (err?.code === 'ERR_CANCELED') return;
  //       setError(t("bookDetail.notFound"));
  //     })
  //     .finally(() => {
  //       if (!cancelled) setLoading(false);
  //     });

  //   return () => {
  //     controller.abort();
  //     cancelled = true;
  //   };
  // }, [decodedId, isAPIKey, t, bookFromState]);

  useEffect(() => {
    if (!isAPIKey) return;

    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      // Firestore
      const cached = await getSynopsisFromDB(decodedId);
      const synopsis = cached !== null && cached.trim().length > 0
        ? cached
        : await (async () => {
            // Obtener de Google Books
            const fetched = await fetchGoogleSynopsis(
              bookFromState?.title ?? decodedId,
              controller.signal,
              bookFromState?.isbn,
              bookFromState?.authors?.[0],
            );
            if (fetched.trim().length > 0) {
              saveSynopsisToDB(decodedId, fetched);
            }
            return fetched;
          })();

      if (cancelled) return;

      const fallback = getBookDetailById(decodedId);
      setBook({
        key: decodedId,
        cover_url: bookFromState?.cover_url ?? (bookFromState?.cover_id ? getCoverUrl(bookFromState.cover_id) : ''),
        genre: bookFromState?.genre ?? '',
        title: bookFromState?.title ?? '',
        author: bookFromState?.authors?.[0] ?? '',
        authorKey: bookFromState?.authorKeys?.[0],
        rating: bookFromState?.rating ?? 0,
        reviewCount: bookFromState?.ratingCount ?? 0,
        pages: bookFromState?.pages ?? 0,
        year: bookFromState?.first_publish_year ?? 0,
        isbn: bookFromState?.isbn ?? '',
        synopsis,
        reviews: fallback?.reviews ?? [],
        authorInfo: fallback?.authorInfo ?? { name: '', photoUrl: '', bio: '', books: [] },
        recommendations: fallback?.recommendations ?? [],
      });
    };

    load()
      .catch(err => {
        if (err?.code === 'ERR_CANCELED') return;
        if (!cancelled) setError(t("bookDetail.notFound"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      controller.abort();
      cancelled = true;
    };
  }, [decodedId, isAPIKey, t, bookFromState]);

  // Estático
  if (!isAPIKey) {
    const base = getBookDetailById(decodedId);
    return {
      book: base,
      loading: false,
      error: base ? null : t("bookDetail.notFound"),
    };
  }

  return { book, loading, error };
}
