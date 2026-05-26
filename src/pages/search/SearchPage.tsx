import { useState, useEffect, useRef, type FormEvent } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useBookSearch } from "@/pages/explore/hooks/useBookSearch";
import BookCard from "@/components/book/cards/BookCard";
import { Search, X } from "lucide-react";
import "./SearchPage.scss";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const q = searchParams.get("q") ?? "";

  const [inputValue, setInputValue] = useState(q);
  const inputRef = useRef<HTMLInputElement>(null);
  const { books, loading, error, totalResults, fetchBooks, resetBookResults } = useBookSearch();

  useEffect(() => {
    setInputValue(q);
  }, [q]);

  useEffect(() => {
    if (q.trim()) {
      fetchBooks(q.trim(), "todo");
    } else {
      resetBookResults();
    }
  }, [q, fetchBooks, resetBookResults]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const showNoResults = !loading && !error && q.trim() !== "" && books.length === 0;

  return (
    <div className="search-page">
      <div className="search-page__search-wrap">
        <form className="search-page__search-form" onSubmit={handleSubmit} role="search">
          <span className="search-page__search-icon" aria-hidden="true">
            <Search size={18} />
          </span>
          <div className="search-page__search-divider" />
          <input
            ref={inputRef}
            className="search-page__search-input"
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t("explore.searchPlaceholder")}
            aria-label={t("search.searchLabel")}
          />
          {inputValue && (
            <button
              type="button"
              className="search-page__search-clear"
              aria-label={t("search.clearLabel")}
              onMouseDown={(e) => {
                e.preventDefault();
                setInputValue("");
                inputRef.current?.focus();
              }}
            >
              <X size={18} />
            </button>
          )}
        </form>
      </div>

      <div className="search-page__results">
        {!q.trim() && (
          <p className="search-page__status">{t("search.emptyPrompt")}</p>
        )}

        {loading && (
          <p className="search-page__status">{t("explore.searching")}</p>
        )}

        {error && !loading && (
          <p className="search-page__error">{error}</p>
        )}

        {showNoResults && (
          <div className="search-page__no-results">
            <h3 className="search-page__no-results-title">{t("myLibrary.noResults")}</h3>
            <p className="search-page__no-results-subtitle">{t("search.noResultsSubtitle")}</p>
            <img src="/no-results.png" alt="" className="search-page__no-results-img" />
          </div>
        )}

        {!loading && books.length > 0 && (
          <>
            <p className="search-page__status">
              {t("explore.resultsFound", { count: totalResults })}
            </p>
            <div className="search-page__grid">
              {books.map((book) => (
                <BookCard key={book.key} book={book} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
