import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { getFavorites } from "@/services/firebase/firebaseUsers";
import { getBookFromDB } from "@/services/firebase/firebaseBooks";
import { useShelf } from "@/hooks/useShelf";
import { useBookSearch } from "@/hooks/useBookSearch";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import SearchBar from "@/components/common/Searchbar";
import BookCard from "@/components/book/cards/BookCard";
import GridLoading from "@/components/layout/GridLoading";
import ExploreSection from "@/components/explore/ExploreSection";
import TrendingSection from "@/components/explore/TrendingSection";
import ExploreGridSkeleton from "@/components/explore/ExploreGridSkeleton";
import ExploreConversionBanner from "@/components/explore/ExploreConversionBanner";
import GenreSection from "@/components/explore/GenreSection";
import { genreToI18nKey, moreGenreTitleKey } from "@/utils/genreUtils";
import type { ExploreSectionParams, ExploreSectionType } from "@/types/ExploreTypes";
import type { SearchFilter } from "@/types/Search";
import { ChevronLeft } from "lucide-react";
import "./ExplorePage.scss";
import { useExploreFeed, type SectionEntry } from "@/hooks/useExploreFeed";

const SCROLL_KEY = "explore_scroll";

const FEATURED_SECTION_TYPES = new Set<import("@/types/ExploreTypes").ExploreSectionType>([
  "because-liked",
  "because-finished",
  "new-releases-for-you",
]);

type ShelfDerived = {
  userShelfKeys: Set<string>;
  userAuthorKeys: string[];
  referenceBooks: import("@/types/Book").Book[];
  favoriteGenre: string | null;
  favoriteGenreLabel: string | null;
  favoriteAuthorKey: string | null;
  favoriteAuthorName: string | null;
  wantToReadBooks: import("@/types/Book").Book[];
  hasBooks: boolean;
  fiveStarAuthorKey: string | null;
  fiveStarAuthorName: string | null;
  likedBook: import("@/types/Book").Book | null;
  finishedBook: import("@/types/Book").Book | null;
};

function truncate(text: string, max = 40): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function buildParamsForEntry(entry: SectionEntry, shelf: ShelfDerived): ExploreSectionParams {
  return {
    userShelfKeys: shelf.userShelfKeys,
    userAuthorKeys: shelf.userAuthorKeys,
    referenceBookKey: entry.referenceBookKey,
    referenceBookTitle: entry.referenceBookTitle,
    referenceGenre: entry.referenceGenre,
    favoriteGenre: entry.favoriteGenre,
    favoriteGenreLabel: entry.favoriteGenreLabel,
    favoriteAuthorKey: entry.favoriteAuthorKey,
    favoriteAuthorName: entry.favoriteAuthorName,
  };
}

function titleKeyForEntry(entry: SectionEntry): string {
  if (entry.type === "more-genre") return moreGenreTitleKey(entry.favoriteGenre);
  const map: Partial<Record<ExploreSectionType, string>> = {
    "trending": "explore.sections.trending",
    "because-reading": "explore.sections.becauseReading",
    "because-liked": "explore.sections.becauseLiked",
    "because-finished": "explore.sections.becauseFinished",
    "because-favorites": "explore.sections.becauseFavorites",
    "acclaimed": "explore.sections.acclaimed",
    "top-genre": "explore.sections.topGenre",
    "new-releases-for-you": "explore.sections.newReleasesForYou",
    "waiting": "explore.sections.waiting",
    "more-author": "explore.sections.moreAuthor",
  };
  return map[entry.type] ?? "explore.sections.trending";
}

function titleHighlightForEntry(entry: SectionEntry): string | undefined {
  if (entry.referenceBookTitle) return truncate(entry.referenceBookTitle);
  if (entry.favoriteGenreLabel ?? entry.favoriteGenre) return entry.favoriteGenreLabel ?? entry.favoriteGenre;
  if (entry.favoriteAuthorName) return entry.favoriteAuthorName;
  return undefined;
}


function ExplorePage() {
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();
  const { isAuthenticated, isGuest, user } = useAuth();
  const { shelfByStatus, loading: shelfLoading } = useShelf();
  const search = useBookSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [favoritesReferenceBook, setFavoritesReferenceBook] = useState<import("@/types/Book").Book | null>(null);
  const scrollRestored = useRef(false);

  const isLoggedIn = isAuthenticated && !isGuest;
  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    if (scrollRestored.current) return;
    scrollRestored.current = true;
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) {
      window.scrollTo(0, parseInt(saved, 10));
      sessionStorage.removeItem(SCROLL_KEY);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !user) return;
    let cancelled = false;
    getFavorites(user.uid).then(async favs => {
      if (cancelled || favs.length === 0) return;
      for (const fav of favs) {
        const book = await getBookFromDB(fav.key, lang);
        if (cancelled) return;
        if (book?.genre) {
          setFavoritesReferenceBook(book);
          return;
        }
      }
    });
    return () => { cancelled = true; };
  }, [isLoggedIn, user?.uid, lang]);

  const handleNavigateToSection = () => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  };

  const shelfDerived = useMemo(() => {
    if (!isLoggedIn || shelfLoading) return null;

    const allBooks = [
      ...shelfByStatus.reading,
      ...shelfByStatus.finished,
      ...shelfByStatus.wantToRead,
      ...shelfByStatus.didNotFinish,
    ];

    const userShelfKeys = new Set(allBooks.map(b => b.key));

    const highRatedBook = [...shelfByStatus.finished, ...shelfByStatus.reading]
      .find(b => (b.rating ?? 0) >= 4) ?? null;
    const referenceBooks = shelfByStatus.reading.length > 0
      ? shelfByStatus.reading
      : highRatedBook ? [highRatedBook] : [];

    const genreCounts: Record<string, number> = {};
    for (const b of [...shelfByStatus.finished, ...shelfByStatus.reading, ...shelfByStatus.wantToRead]) {
      if (b.genre) genreCounts[b.genre] = (genreCounts[b.genre] ?? 0) + 1;
    }
    const favoriteGenre = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

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

    const userAuthorKeys = [...new Set(allBooks.flatMap(b => b.authorKeys ?? []))];

    const favoriteGenreLabel = favoriteGenre
      ? t(`book.genres.${genreToI18nKey(favoriteGenre)}`, { defaultValue: favoriteGenre })
      : null;

    const fiveStarBook = [...shelfByStatus.finished, ...shelfByStatus.reading]
      .find(b => (b.rating ?? 0) === 5 && b.authorKeys?.length) ?? null;
    const fiveStarAuthorKey = fiveStarBook?.authorKeys?.[0] ?? null;
    const fiveStarAuthorName = fiveStarBook?.authors?.[0] ?? null;

    const likedBook = [...shelfByStatus.finished, ...shelfByStatus.reading]
      .find(b => (b.rating ?? 0) >= 4 && b.genre) ?? null;

    const finishedBook = shelfByStatus.finished.find(b => b.genre) ?? null;

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
      fiveStarAuthorKey,
      fiveStarAuthorName,
      likedBook,
      finishedBook,
    };
  }, [isLoggedIn, shelfLoading, shelfByStatus, t]);

  const sectionsResult = useExploreFeed(
    isLoggedIn && shelfDerived?.hasBooks
      ? {
          lang,
          userShelfKeys: shelfDerived.userShelfKeys,
          userAuthorKeys: shelfDerived.userAuthorKeys,
          favoriteGenre: shelfDerived.favoriteGenre,
          favoriteGenreLabel: shelfDerived.favoriteGenreLabel,
          favoriteAuthorKey: shelfDerived.favoriteAuthorKey,
          favoriteAuthorName: shelfDerived.favoriteAuthorName,
          fiveStarAuthorKey: shelfDerived.fiveStarAuthorKey,
          fiveStarAuthorName: shelfDerived.fiveStarAuthorName,
          referenceBooks: shelfDerived.referenceBooks,
          wantToReadBooks: shelfDerived.wantToReadBooks,
          likedBook: shelfDerived.likedBook,
          finishedBook: shelfDerived.finishedBook,
          favoritesReferenceBook,
        }
      : {
          lang, userShelfKeys: new Set(), userAuthorKeys: [],
          favoriteGenre: null, favoriteGenreLabel: null,
          favoriteAuthorKey: null, favoriteAuthorName: null,
          fiveStarAuthorKey: null, fiveStarAuthorName: null,
          referenceBooks: [], wantToReadBooks: [],
          likedBook: null, finishedBook: null, favoritesReferenceBook: null,
        },
      !(isLoggedIn && shelfDerived?.hasBooks)
  );

  const handleSearch = (query: string, filter: SearchFilter) => {
    setSearchQuery(query);
    if (query.trim()) search.fetchBooks(query, filter, 20, lang);
    else search.resetBookResults();
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    search.resetBookResults();
  };

  const showGuestVersion = !isLoggedIn || (shelfDerived !== null && !shelfDerived.hasBooks);

  const shelfParams: Partial<ExploreSectionParams> = shelfDerived
    ? { userShelfKeys: shelfDerived.userShelfKeys, userAuthorKeys: shelfDerived.userAuthorKeys }
    : {};

  return (
    <>
      <SearchBar onSearch={handleSearch} />

      {isSearching && (
        <div className="explore-page__search-status">
          <p>
            {search.loading
              ? t("explore.searching")
              : t("explore.resultsFound", { count: search.totalResults })}
          </p>
          <button onClick={handleClearSearch} className="explore-page__clear-btn">
            <ChevronLeft aria-hidden="true" />
            {t("explore.backBtn")}
          </button>
        </div>
      )}

      {isSearching ? (
        <section className="explore-page__section">
          {search.loading && <GridLoading />}
          {search.error && <p className="explore-page__error">{search.error}</p>}
          {!search.loading && !search.error && (
            search.books.length === 0 ? (
              <div className="explore-page__no-results">
                <h3 className="explore-page__no-results-title">{t("myLibrary.noResults")}</h3>
                <img src="/no-results.png" alt="" className="explore-page__no-results-img" />
              </div>
            ) : (
              <div className="explore-page__search-grid">
                {search.books.map(book => (
                  <BookCard key={book.key} book={book} />
                ))}
              </div>
            )
          )}
        </section>
      ) : (
        <div className="explore-page__sections">

          {showGuestVersion && (
            <TrendingSection
              params={shelfParams}
              onNavigate={handleNavigateToSection}
            />
          )}

          {!showGuestVersion && sectionsResult.loading && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="explore-page__skeleton-section">
                  <div className="explore-page__skeleton-title" />
                  <ExploreGridSkeleton />
                </div>
              ))}
            </>
          )}

          {!showGuestVersion && !sectionsResult.loading && (
            <>
              {sectionsResult.sections.map((entry) => (
                <Fragment key={entry.id}>
                  {entry.type === "genre-grid" ? (
                    <>
                      <GenreSection
                        featuredGenre={shelfDerived?.favoriteGenre ?? "Fiction"}
                      />
                      <ExploreSection
                        type="acclaimed"
                        titleKey="explore.sections.acclaimed"
                        featured
                        onNavigate={handleNavigateToSection}
                      />
                    </>
                  ) : entry.type === "trending" ? (
                    <TrendingSection
                      books={entry.books}
                      isFallback={entry.isFallback}
                      params={buildParamsForEntry(entry, shelfDerived!)}
                      onNavigate={handleNavigateToSection}
                    />
                  ) : (
                    <ExploreSection
                      type={entry.type}
                      override={{ books: entry.books, isFallback: entry.isFallback }}
                      params={buildParamsForEntry(entry, shelfDerived!)}
                      titleKey={titleKeyForEntry(entry)}
                      titleFallbackKey={entry.type === "new-releases-for-you" ? "explore.sections.newReleasesFallback" : undefined}
                      titleHighlight={titleHighlightForEntry(entry)}
                      featured={FEATURED_SECTION_TYPES.has(entry.type)}
                      onNavigate={handleNavigateToSection}
                    />
                  )}
                </Fragment>
              ))}
            </>
          )}

          {showGuestVersion && (
            <>
              <ExploreSection
                type="acclaimed"
                titleKey="explore.sections.acclaimed"
                featured
                onNavigate={handleNavigateToSection}
              />

              {isGuest && <ExploreConversionBanner />}

              <GenreSection featuredGenre="Fiction" />

              <ExploreSection
                type="more-author"
                titleKey="explore.sections.moreAuthor"
                onNavigate={handleNavigateToSection}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}

export default ExplorePage;
