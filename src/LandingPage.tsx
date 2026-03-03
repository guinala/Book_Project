import { useState } from "react";
import SearchBar from "./components/SearchBar";
import BookList from "./components/BookList";
import { useFantasyBooks } from "./hooks/useFantasyBooks";
import { useBookSearch } from "./hooks/useBookSearch";
import type { SearchFilter } from "./types/Search";
import "./styles/css/LandingPage.css";

function LandingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<SearchFilter>("todo");

  const fantasy = useFantasyBooks(20);
  const search = useBookSearch(searchQuery, searchFilter, 20);

  const isSearching = searchQuery.trim().length > 0;

  const handleSearch = (query: string, filter: SearchFilter) => {
    setSearchQuery(query);
    setSearchFilter(filter);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const activeBooks = isSearching ? search.books : fantasy.books;
  const activeLoading = isSearching ? search.loading : fantasy.loading;
  const activeError = isSearching ? search.error : fantasy.error;
  const activeTitle = isSearching
    ? `Resultados para "${searchQuery}"`
    : "Fantasía";

  return (
    <>
      <main>
        <SearchBar onSearch={handleSearch}/>

        {isSearching && (
          <div className="landing-page__search-status">
            <p>
              {search.loading
                ? "Buscando..."
                : `${search.totalResults} resultados encontrados`}
            </p>
            <button
              onClick={handleClearSearch}
              className="landing-page__clear-btn"
            >
              Volver
            </button>
          </div>
        )}

        <BookList
          books={activeBooks}
          loading={activeLoading}
          error={activeError}
          title={activeTitle}
        />
      </main>
    </>
  );
}

export default LandingPage;
