import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SearchBar from "@/components/Searchbar/Searchbar";
import BookList from "@/components/BookList/BookList";
//import { useFantasyBooks } from "@/hooks/useFantasyBooks";
import { useBookSearch } from "@/hooks/useBookSearch";
import { useFantasyBooks_GoogleOpen } from "@/hooks/useFantasyBooks_GoogleOpen";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import type { SearchFilter } from "@/types/Search";
import "./ExplorePage.scss";

function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  //const [searchFilter, setSearchFilter] = useState<SearchFilter>("todo");
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();

  //const fantasy = useFantasyBooks(20, lang);
  const hybrid = useFantasyBooks_GoogleOpen();
  const {fetchBooks, cancelRequest} = hybrid;
  const search = useBookSearch();

  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    fetchBooks(20, lang);
    return () => cancelRequest();
  }, [lang, fetchBooks, cancelRequest]);

  const handleSearch = (query: string, filter: SearchFilter) => {
    setSearchQuery(query);
    //setSearchFilter(filter);
    if(query.trim()){
      search.fetchBooks(query, filter, 20, lang);
    } else{
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
          <button
            onClick={handleClearSearch}
            className="explore-page__clear-btn"
          >
            {t("explore.backBtn")}
          </button>
        </div>
      )}

      <BookList
        books={activeBooks}
        loading={activeLoading}
        error={activeError}
        title={activeTitle}
      />
    </>
  );
}

export default ExplorePage;