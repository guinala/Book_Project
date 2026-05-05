import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useShelf } from "@/hooks/useShelf";
import { useBookSearch } from "@/hooks/useBookSearch";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import SearchBar from "@/components/common/Searchbar";
import BookGridCard from "@/components/book/cards/BookGridCard";
import GridLoading from "@/components/layout/GridLoading";
import ExploreSection from "@/components/explore/ExploreSection";
import ExploreConversionBanner from "@/components/explore/ExploreConversionBanner";
import { genreToI18nKey } from "@/utils/genreUtils";
import type { ExploreSectionParams } from "@/types/ExploreTypes";
import type { SearchFilter } from "@/types/Search";
import "./ExplorePage.scss";

const SCROLL_KEY = "explore_scroll";

function truncate(text: string, max = 40): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function ExplorePage() {
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();
  const { isAuthenticated, isGuest } = useAuth();
  const { shelfByStatus, loading: shelfLoading } = useShelf();
  const search = useBookSearch();
  const [searchQuery, setSearchQuery] = useState("");
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

    const readingBook = shelfByStatus.reading[0] ?? null;
    const highRatedBook = [...shelfByStatus.finished, ...shelfByStatus.reading]
      .find(b => (b.rating ?? 0) >= 4) ?? null;
    const referenceBook = readingBook ?? highRatedBook;

    const genreCounts: Record<string, number> = {};
    for (const b of [...shelfByStatus.finished, ...shelfByStatus.reading]) {
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

    return {
      userShelfKeys,
      referenceBook,
      favoriteGenre,
      favoriteGenreLabel,
      favoriteAuthorKey: favoriteAuthor?.[0] ?? null,
      favoriteAuthorName: favoriteAuthor?.[1].name ?? null,
      userAuthorKeys,
      wantToReadBooks: shelfByStatus.wantToRead,
      hasBooks: allBooks.length > 0,
    };
  }, [isLoggedIn, shelfLoading, shelfByStatus, t]);

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
            {t("explore.backBtn")}
          </button>
        </div>
      )}

      {isSearching ? (
        <section className="explore-page__section">
          {search.loading && <GridLoading />}
          {search.error && <p className="explore-page__error">{search.error}</p>}
          {!search.loading && !search.error && (
            <div className="explore-page__search-grid">
              {search.books.map(book => (
                <BookGridCard key={book.key} book={book} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="explore-page__sections">

          <ExploreSection
            type="trending"
            params={shelfParams}
            titleKey="explore.sections.trending"
            titleFallbackKey="explore.sections.trendingFallback"
            onNavigate={handleNavigateToSection}
          />

          {showGuestVersion ? (
            <>
              <ExploreSection
                type="top-rated"
                titleKey="explore.sections.topRated"
                onNavigate={handleNavigateToSection}
              />

              {isGuest && <ExploreConversionBanner />}

              <ExploreSection
                type="fiction"
                titleKey="explore.sections.fiction"
                onNavigate={handleNavigateToSection}
              />

              <ExploreSection
                type="non-fiction"
                titleKey="explore.sections.nonFiction"
                onNavigate={handleNavigateToSection}
              />

              <ExploreSection
                type="new-releases"
                titleKey="explore.sections.newReleases"
                onNavigate={handleNavigateToSection}
              />

              <ExploreSection
                type="quick-reads"
                titleKey="explore.sections.quickReads"
                onNavigate={handleNavigateToSection}
              />
            </>
          ) : (
            <>
              {shelfDerived?.referenceBook && (
                <ExploreSection
                  type="because-reading"
                  params={{
                    ...shelfParams,
                    referenceBookKey: shelfDerived.referenceBook.key,
                    referenceBookTitle: truncate(shelfDerived.referenceBook.title),
                    referenceGenre: shelfDerived.referenceBook.genre,
                  }}
                  titleKey="explore.sections.becauseReading"
                  titleHighlight={truncate(shelfDerived.referenceBook.title)}
                  onNavigate={handleNavigateToSection}
                />
              )}

              {shelfDerived?.favoriteGenre && (
                <ExploreSection
                  type="more-genre"
                  params={{
                    ...shelfParams,
                    favoriteGenre: shelfDerived.favoriteGenre,
                    favoriteGenreLabel: shelfDerived.favoriteGenreLabel ?? undefined,
                  }}
                  titleKey="explore.sections.moreGenre"
                  titleHighlight={shelfDerived.favoriteGenreLabel ?? shelfDerived.favoriteGenre}
                  onNavigate={handleNavigateToSection}
                />
              )}

              <ExploreSection
                type="new-releases-for-you"
                params={shelfParams}
                titleKey="explore.sections.newReleasesForYou"
                titleFallbackKey="explore.sections.newReleasesFallback"
                onNavigate={handleNavigateToSection}
              />

              {(shelfDerived?.wantToReadBooks?.length ?? 0) > 0 && (
                <ExploreSection
                  type="waiting"
                  params={{ ...shelfParams, wantToReadBooks: shelfDerived!.wantToReadBooks }}
                  titleKey="explore.sections.waiting"
                  onNavigate={handleNavigateToSection}
                />
              )}

              {shelfDerived?.favoriteAuthorKey && (
                <ExploreSection
                  type="more-author"
                  params={{
                    ...shelfParams,
                    favoriteAuthorKey: shelfDerived.favoriteAuthorKey,
                    favoriteAuthorName: shelfDerived.favoriteAuthorName ?? undefined,
                  }}
                  titleKey="explore.sections.moreAuthor"
                  titleHighlight={shelfDerived.favoriteAuthorName ?? undefined}
                  onNavigate={handleNavigateToSection}
                />
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

export default ExplorePage;
