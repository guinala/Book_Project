import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import BookCard from "@/components/book/cards/BookCard";
import GridLoading from "@/components/layout/GridLoading";
import type { Book } from "@/types/Book";

type ExploreSearchResultsProps = {
  loading: boolean;
  error: string | null;
  books: Book[];
  totalResults: number;
  onClear: () => void;
};

export default function ExploreSearchResults({
  loading, error, books, totalResults, onClear,
}: ExploreSearchResultsProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="explore-page__search-status">
        <p>
          {loading ? t("explore.searching") : t("explore.resultsFound", { count: totalResults })}
        </p>
        <button onClick={onClear} className="explore-page__clear-btn">
          <ChevronLeft aria-hidden="true" />
          {t("explore.backBtn")}
        </button>
      </div>
      <section className="explore-page__section">
        {loading && <GridLoading />}
        {error && <p className="explore-page__error">{error}</p>}
        {!loading && !error && (
          books.length === 0 ? (
            <div className="explore-page__no-results">
              <h3 className="explore-page__no-results-title">{t("myLibrary.noResults")}</h3>
              <img src="/no-results.png" alt="" className="explore-page__no-results-img" />
            </div>
          ) : (
            <div className="explore-page__search-grid">
              {books.map((book) => <BookCard key={book.key} book={book} />)}
            </div>
          )
        )}
      </section>
    </>
  );
}
