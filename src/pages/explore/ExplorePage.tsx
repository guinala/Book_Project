import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SearchBar from "@/components/common/Searchbar";
import BookGridCard from "@/components/book/cards/BookGridCard";
import { useBookSearch } from "@/hooks/useBookSearch";
import { useExploreBooks } from "@/hooks/useExploreBooks";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import type { SearchFilter } from "@/types/Search";
import "./ExplorePage.scss";
import GridLoading from "@/components/layout/GridLoading";

function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();

  const hybrid = useExploreBooks();
  const { fetchBooks, cancelRequest } = hybrid;
  const search = useBookSearch();

  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    fetchBooks(10, lang);
    return () => cancelRequest();
  }, [lang, fetchBooks, cancelRequest]);

  const handleSearch = (query: string, filter: SearchFilter) => {
    setSearchQuery(query);
    if (query.trim()) {
      search.fetchBooks(query, filter, 20, lang);
    } else {
      search.resetBookResults();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    search.resetBookResults();
  };

  const activeBooks = isSearching ? search.books : hybrid.books;
  const activeLoading = isSearching ? search.loading : hybrid.loading;
  const activeError = isSearching ? search.error : hybrid.error;
  const activeTitle = isSearching
    ? t("explore.resultsTitle", { query: searchQuery })
    : t("explore.fantasyTitle");

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

      <section className="explore-page__section">
        <h2 className="explore-page__section-title">{activeTitle}</h2>

        {activeLoading && <GridLoading />}

        {activeError && (
          <p className="explore-page__error">{activeError}</p>
        )}

        {!activeLoading && !activeError && (
          <div className="explore-page__grid">
            {activeBooks.map((book) => (
              <BookGridCard key={book.key} book={book} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default ExplorePage;
