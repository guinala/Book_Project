import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useBookSearch } from "@/hooks/useBookSearch";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import BookCard from "@/components/book/cards/BookCard";
import GridLoading from "@/components/layout/GridLoading";
import { ChevronLeft } from "lucide-react";
import "./SearchPage.scss";

export default function SearchPage() {
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const search = useBookSearch();

  useEffect(() => {
    if (!query) return;
    search.fetchBooks(query, "todo", 20, lang);
  // fetchBooks is stable (useCallback([])); lang won't change mid-navigation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="search-page">
      <div className="search-page__header">
        <button className="search-page__back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft aria-hidden="true" />
          {t("explore.backBtn")}
        </button>
        <p className="search-page__status">
          {search.loading
            ? t("explore.searching")
            : t("explore.resultsFound", { count: search.totalResults })}
        </p>
      </div>

      <section className="search-page__results">
        {search.loading && <GridLoading />}
        {search.error && <p className="search-page__error">{search.error}</p>}
        {!search.loading && !search.error && (
          search.books.length === 0 ? (
            <div className="search-page__no-results">
              <h3 className="search-page__no-results-title">{t("myLibrary.noResults")}</h3>
              <img src="/no-results.png" alt="" className="search-page__no-results-img" />
            </div>
          ) : (
            <div className="search-page__grid">
              {search.books.map(book => (
                <BookCard key={book.key} book={book} />
              ))}
            </div>
          )
        )}
      </section>
    </div>
  );
}
