import { useEffect, useRef } from "react";
import { useAuth } from "@/context/auth/useAuth";
import { getFavorites } from "@/services/firebase/firebaseUsers";
import { getBookFromDB } from "@/services/firebase/firebaseBooks";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import SearchBar from "@/components/common/Searchbar";
import type { ExploreSectionParams } from "@/types/ExploreTypes";
import "./ExplorePage.scss";
import { useExploreFeed } from "./hooks/useExploreFeed";
import { useShelfDerivedFavorites } from "./hooks/useShelfDerivedFavorites";
import ExploreSectionsList from "@/components/explore/ExploreSectionsList";
import ExploreGuestSections from "@/components/explore/ExploreGuestSections";
import { useQuery } from "@tanstack/react-query";

const SCROLL_KEY = "explore_scroll";

function ExplorePage() {
  const { lang } = useCurrentLanguage();
  const { isAuthenticated, isGuest, user } = useAuth();
  const shelfDerived = useShelfDerivedFavorites();
  const scrollRestored = useRef(false);

  const isLoggedIn = isAuthenticated && !isGuest;

  const { data: favoritesReferenceBook = null } = useQuery({
    queryKey: ["favorites-reference-book", user?.uid ?? null, lang],
    queryFn: async () => {
      const favs = await getFavorites(user!.uid);
      for (const fav of favs) {
        const book = await getBookFromDB(fav.key, lang);
        if (book?.genre) return book;
      }
      return null;
    },
    enabled: isLoggedIn && !!user,
  });


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

  const showGuestVersion = !isLoggedIn || (shelfDerived !== null && !shelfDerived.hasBooks);

  const shelfParams: Partial<ExploreSectionParams> = shelfDerived
    ? { userShelfKeys: shelfDerived.userShelfKeys, userAuthorKeys: shelfDerived.userAuthorKeys }
    : {};

  return (
    <>
      <SearchBar />
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
    </>
  );
}

export default ExplorePage;
