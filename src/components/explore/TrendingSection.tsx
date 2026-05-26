import { useTranslation } from "react-i18next";
import BookCard from "@/components/book/cards/BookCard";
import ExploreGridSkeleton from "./ExploreGridSkeleton";
import { useSectionBooks } from "@/pages/explore/hooks/useSectionBooks";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import type { ExploreSectionParams } from "@/types/ExploreTypes";
import type { Book } from "@/types/Book";
import "./TrendingSection.scss";

const TRENDING_COUNT = 10;

type Props = {
  params?: ExploreSectionParams;
  books?: Book[];
  isFallback?: boolean;
  onNavigate?: () => void;
};

export default function TrendingSection({ params = {}, books: overrideBooks, isFallback: overrideFallback }: Props) {
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();

  const hasOverride = overrideBooks !== undefined;
  const result = useSectionBooks("trending", params, lang, TRENDING_COUNT, hasOverride);

  const books = hasOverride ? overrideBooks.slice(0, TRENDING_COUNT) : result.books;
  const loading = hasOverride ? false : result.loading;
  const error = hasOverride ? null : result.error;
  const isFallback = hasOverride ? (overrideFallback ?? false) : result.isFallback;
  const retry = hasOverride ? () => {} : result.retry;

  const titleKey = isFallback ? "explore.sections.trendingFallback" : "explore.sections.trending";

  if (!loading && !error && books.length === 0) return null;

  return (
    <section className="trending-section">
      <div className="trending-section__header">
        <h2 className="trending-section__title">{t(titleKey)}</h2>
      </div>

      {loading && <ExploreGridSkeleton />}

      {error && (
        <div className="trending-section__error">
          <p className="trending-section__error-text">{t("explore.sectionError")}</p>
          <button type="button" className="trending-section__retry" onClick={retry}>
            {t("explore.retry")}
          </button>
        </div>
      )}

      {!loading && !error && books.length > 0 && (
        <div className="trending-section__scroll">
          {books.map((book, i) => (
            <div key={book.key} className="trending-section__item">
              <span className="trending-section__rank" aria-hidden="true">
                {i + 1}
              </span>
              <BookCard book={book} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
