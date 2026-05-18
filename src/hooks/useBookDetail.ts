import type { BookDetail } from "@/types/BookDetail";
import type { Book } from "@/types/Book";
import { FALLBACK_REVIEWS } from "@/utils/bookDetailData";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useLocation } from "react-router";
// import { extractSynopsis, getWork } from "@/services/api/openLibraryApi";  
import { getCoverUrl } from "@/utils/coverImage";
import { getBookFromDB, getSynopsisFromDB, saveSynopsisToDB, updateBookTitleToDB } from "@/services/firebase/firebaseBooks";
import { logger } from "@/utils/logger";
import { toWorkKey } from "@/utils/bookPaths";
import { fetchWorkEditionByLang } from "@/services/api/openLibraryApi";
import { fetchSynopsisRace } from "@/services/api/synopsisSources";

export function useBookDetail(id: string): {
  book: BookDetail | null;
  loading: boolean;
  error: string | null;
} {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.split('-')[0];
  const location = useLocation();
  const bookFromState: Book | undefined = location.state?.book;
  logger.log('location.state:', location.state);
  logger.log('bookFromState:', bookFromState);


  // const decodedId = decodeURIComponent(id);
  // const isAPIKey = decodedId.startsWith('/works/');
  const workKey = toWorkKey(id); 
  const isAPIKey = workKey.startsWith('/works/');
  

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
    if(!isAPIKey) return;

    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      // Firestore
      const dbBook = await getBookFromDB(workKey, lang);
      const cached = await getSynopsisFromDB(workKey, lang);
      const synopsis = cached !== null && cached.trim().length > 0
        ? cached
        : await (async () => {
            // Obtener de Google Books
            // let langIsbn = bookFromState?.isbns?.[lang];
            // let langTitle = bookFromState?.titles?.[lang];
            let langIsbn = dbBook?.isbns?.[lang] ?? bookFromState?.isbns?.[lang];
            let langTitle = dbBook?.titles?.[lang] ?? bookFromState?.titles?.[lang];

            if (!langIsbn || !langTitle) {
              const edition = await fetchWorkEditionByLang(workKey, lang);
              if (edition?.isbn) {
                langIsbn = edition.isbn;
                langTitle = edition.title;
                updateBookTitleToDB(workKey, edition.title, lang, edition.isbn).catch(() => {});
              }
            }

            // const fetched = await fetchGoogleSynopsis(
            //   langTitle ?? workKey,
            //   controller.signal,
            //   langIsbn ?? bookFromState?.isbn,
            //   bookFromState?.authors?.[0],
            //   lang
            // );
            const fetched = await fetchSynopsisRace({
              title: langTitle ?? workKey,
              isbn: langIsbn ?? dbBook?.isbn ?? bookFromState?.isbn,
              author: dbBook?.authors?.[0] ?? bookFromState?.authors?.[0],
              lang,
              signal: controller.signal,
              workKey,   
            });

            if (fetched.trim().length > 0) {
              saveSynopsisToDB(workKey, fetched, lang);
            }
            return fetched;
          })();

      if (cancelled) return;

      setBook({
        key: workKey,
        cover_url:
          dbBook?.cover_url ??
          bookFromState?.cover_url ??
          (bookFromState?.cover_id ? getCoverUrl(bookFromState.cover_id) : ''),
        genre: dbBook?.genre ?? bookFromState?.genre ?? '',
        genre2: dbBook?.genre2 ?? bookFromState?.genre2,
        title:
          dbBook?.title ??
          bookFromState?.titles?.[lang] ??
          bookFromState?.title ??
          '',
        author: dbBook?.authors?.[0] ?? bookFromState?.authors?.[0] ?? '',
        authorKey: dbBook?.authorKeys?.[0] ?? bookFromState?.authorKeys?.[0],
        rating: dbBook?.rating ?? bookFromState?.rating ?? 0,
        reviewCount: dbBook?.ratingCount ?? bookFromState?.ratingCount ?? 0,
        pages: dbBook?.pages ?? bookFromState?.pages ?? 0,
        year: dbBook?.first_publish_year ?? bookFromState?.first_publish_year ?? 0,
        isbn:
          dbBook?.isbn ??
          bookFromState?.isbns?.[lang] ??
          bookFromState?.isbn ??
          '',
        synopsis,
        reviews: FALLBACK_REVIEWS,
        authorInfo: { name: '', photoUrl: '', bio: '', books: [] },
        recommendations: [],
      });

      // Obtener sinopsis para otro idioma
      const otherLang = lang === 'es' ? 'en' : 'es';
      getSynopsisFromDB(workKey, otherLang).then(async otherCached => {
        if (otherCached && otherCached.trim().length > 0) return;
        // Resolver título/isbn del otro idioma si faltan
        let otherTitle = dbBook?.titles?.[otherLang] ?? bookFromState?.titles?.[otherLang];
        let otherIsbn = dbBook?.isbns?.[otherLang] ?? bookFromState?.isbns?.[otherLang];
        if (!otherTitle || !otherIsbn) {
          const edition = await fetchWorkEditionByLang(workKey, otherLang);
          if (edition?.title) {
            otherTitle = edition.title;
            otherIsbn = edition.isbn;
            updateBookTitleToDB(workKey, edition.title, otherLang, edition.isbn).catch(() => {});
          }
        }

        if (!otherTitle) return;

        const otherSynopsis = await fetchSynopsisRace({
          title: otherTitle,
          isbn: otherIsbn,
          author: dbBook?.authors?.[0] ?? bookFromState?.authors?.[0],
          lang: otherLang,
          signal: controller.signal,
          workKey
        });

        if (otherSynopsis.trim().length > 0) {
          saveSynopsisToDB(workKey, otherSynopsis, otherLang);
        }
      }).catch(() => {});
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
  }, [workKey, isAPIKey, t, bookFromState, lang]);

  return { book, loading, error };
}
