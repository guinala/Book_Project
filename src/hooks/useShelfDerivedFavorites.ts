import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./useAuth";
import { useShelf } from "./useShelf";
import { genreToI18nKey } from "@/utils/genreUtils";
import type { Book } from "@/types/Book";

export type ShelfDerived = {
  userShelfKeys: Set<string>;
  userAuthorKeys: string[];
  referenceBooks: Book[];
  favoriteGenre: string | null;
  favoriteGenreLabel: string | null;
  favoriteAuthorKey: string | null;
  favoriteAuthorName: string | null;
  wantToReadBooks: Book[];
  hasBooks: boolean;
  fiveStarAuthorKey: string | null;
  fiveStarAuthorName: string | null;
  likedBook: Book | null;
  finishedBook: Book | null;
};

export function useShelfDerivedFavorites(): ShelfDerived | null {
  const { isAuthenticated, isGuest } = useAuth();
  const { shelfByStatus, loading } = useShelf();
  const { t } = useTranslation();
  const isLoggedIn = isAuthenticated && !isGuest;

  return useMemo(() => {
    if (!isLoggedIn || loading) return null;

    const allBooks = [
      ...shelfByStatus.reading,
      ...shelfByStatus.finished,
      ...shelfByStatus.wantToRead,
      ...shelfByStatus.didNotFinish,
    ];

    const userShelfKeys = new Set(allBooks.map((b) => b.key));

    const highRatedBook = [...shelfByStatus.finished, ...shelfByStatus.reading]
      .find((b) => (b.rating ?? 0) >= 4) ?? null;
    const referenceBooks = shelfByStatus.reading.length > 0
      ? shelfByStatus.reading
      : highRatedBook ? [highRatedBook] : [];

    const genreCounts: Record<string, number> = {};
    for (const b of [...shelfByStatus.finished, ...shelfByStatus.reading, ...shelfByStatus.wantToRead]) {
      if (b.genre) genreCounts[b.genre] = (genreCounts[b.genre] ?? 0) + 1;
    }
    const favoriteGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const authorKeyCounts: Record<string, { count: number; name: string }> = {};
    for (const b of [...shelfByStatus.finished, ...shelfByStatus.reading]) {
      (b.authorKeys ?? []).forEach((key, i) => {
        const name = b.authors[i] ?? b.authors[0];
        const prev = authorKeyCounts[key];
        authorKeyCounts[key] = { count: (prev?.count ?? 0) + 1, name: prev?.name ?? name };
      });
    }
    const favoriteAuthor = Object.entries(authorKeyCounts)
      .filter(([, v]) => v.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)[0];

    const userAuthorKeys = [...new Set(allBooks.flatMap((b) => b.authorKeys ?? []))];

    const favoriteGenreLabel = favoriteGenre
      ? t(`book.genres.${genreToI18nKey(favoriteGenre)}`, { defaultValue: favoriteGenre })
      : null;

    const fiveStarBook = [...shelfByStatus.finished, ...shelfByStatus.reading]
      .find((b) => (b.rating ?? 0) === 5 && b.authorKeys?.length) ?? null;

    const likedBook = [...shelfByStatus.finished, ...shelfByStatus.reading]
      .find((b) => (b.rating ?? 0) >= 4 && b.genre) ?? null;

    const finishedBook = shelfByStatus.finished.find((b) => b.genre) ?? null;

    return {
      userShelfKeys,
      referenceBooks,
      favoriteGenre,
      favoriteGenreLabel,
      favoriteAuthorKey: favoriteAuthor?.[0] ?? null,
      favoriteAuthorName: favoriteAuthor?.[1].name ?? null,
      userAuthorKeys,
      wantToReadBooks: shelfByStatus.wantToRead,
      hasBooks: allBooks.length > 0,
      fiveStarAuthorKey: fiveStarBook?.authorKeys?.[0] ?? null,
      fiveStarAuthorName: fiveStarBook?.authors?.[0] ?? null,
      likedBook,
      finishedBook,
    };
  }, [isLoggedIn, loading, shelfByStatus, t]);
}
