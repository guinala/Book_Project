import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/auth/useAuth";
import { getFavorites } from "@/services/firebase/firebaseUsers";
import { getBookFromDB } from "@/services/firebase/firebaseBooks";
import { useBookSearch } from "@/pages/explore/hooks/useBookSearch";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import SearchBar from "@/components/common/Searchbar";
import type { ExploreSectionParams } from "@/types/ExploreTypes";
import type { SearchFilter } from "@/types/Search";
import "./ExplorePage.scss";
import { useExploreFeed } from "./hooks/useExploreFeed";
import { useExploreCache } from "@/context/explore-cache/useExploreCache";
import { useShelfDerivedFavorites } from "./hooks/useShelfDerivedFavorites";
import type { Book } from "@/types/Book";
import ExploreSectionsList from "@/components/explore/ExploreSectionsList";
import ExploreGuestSections from "@/components/explore/ExploreGuestSections";
import ExploreSearchResults from "@/components/explore/ExploreSearchResults";

const SCROLL_KEY = "explore_scroll";

function ExplorePage() {
  const { clearIfDirty } = useExploreCache();
  const { lang } = useCurrentLanguage();
  const { isAuthenticated, isGuest, user } = useAuth();
  const { books, loading, error, totalResults, fetchBooks, resetBookResults } = useBookSearch();
  const shelfDerived = useShelfDerivedFavorites();
  const [searchQuery, setSearchQuery] = useState("");
  const [favoritesReferenceBook, setFavoritesReferenceBook] = useState<Book | null>(null);
  const scrollRestored = useRef(false);

  const isLoggedIn = isAuthenticated && !isGuest;
  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    clearIfDirty();
  }, [clearIfDirty]);

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
    getFavorites(user.uid).then(async (favs) => {
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
  }, [isLoggedIn, user, lang]);

  const handleNavigateToSection = () => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  };

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

  const handleSearch = useCallback((query: string, filter: SearchFilter) => {
    setSearchQuery(query);
    if (query.trim()) fetchBooks(query, filter, 20, lang);
    else resetBookResults();
  }, [fetchBooks, resetBookResults, lang]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    resetBookResults();
  }, [resetBookResults]);

  const showGuestVersion = !isLoggedIn || (shelfDerived !== null && !shelfDerived.hasBooks);

  const shelfParams: Partial<ExploreSectionParams> = shelfDerived
    ? { userShelfKeys: shelfDerived.userShelfKeys, userAuthorKeys: shelfDerived.userAuthorKeys }
    : {};

  return (
    <>
      <SearchBar onSearch={handleSearch} />

      {isSearching ? (
        <ExploreSearchResults
          loading={loading}
          error={error}
          books={books}
          totalResults={totalResults}
          onClear={handleClearSearch}
        />
      ) : (
        <div className="explore-page__sections">
          {showGuestVersion && (
            <ExploreGuestSections
              showConversionBanner={isGuest}
              shelfParams={shelfParams}
              onNavigate={handleNavigateToSection}
            />
          )}
          {!showGuestVersion && shelfDerived && (
            <ExploreSectionsList
              sections={sectionsResult.sections}
              loading={sectionsResult.loading}
              shelfDerived={shelfDerived}
              onNavigate={handleNavigateToSection}
            />
          )}
        </div>
      )}
    </>
  );
}

export default ExplorePage;
