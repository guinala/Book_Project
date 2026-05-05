import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import BookGridCard from "@/components/book/cards/BookGridCard";
import ExploreGridSkeleton from "./ExploreGridSkeleton";
import { useExploreSection } from "@/hooks/useExploreSection";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import type { ExploreSectionParams, ExploreSectionType } from "@/types/ExploreTypes";
import "./ExploreSection.scss";

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

type ExploreSectionProps = {
  type: ExploreSectionType;
  params?: ExploreSectionParams;
  titleKey?: string;
  titleFallbackKey?: string;
  titleHighlight?: string;
  onNavigate?: () => void;
};

function buildSectionUrl(type: ExploreSectionType, params: ExploreSectionParams = {}): string {
  const base = `/explore/section/${type}`;
  const search = new URLSearchParams();
  if (params.referenceBookKey) search.set("bookKey", params.referenceBookKey);
  if (params.referenceBookTitle) search.set("bookTitle", params.referenceBookTitle);
  if (params.referenceGenre) search.set("genre", params.referenceGenre);
  if (params.favoriteGenre) search.set("genre", params.favoriteGenre);
  if (params.favoriteGenreLabel) search.set("genreLabel", params.favoriteGenreLabel);
  if (params.favoriteAuthorKey) search.set("authorKey", params.favoriteAuthorKey);
  if (params.favoriteAuthorName) search.set("authorName", params.favoriteAuthorName);
  if (params.userAuthorKeys?.length) search.set("authorKeys", params.userAuthorKeys.join(","));
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

function renderTitle(title: string, highlight: string | undefined): React.ReactNode {
  if (!highlight || !title.includes(highlight)) return title;
  const [before, after] = title.split(highlight);
  return (
    <>
      {before}
      <span className="explore-section__title-accent">{highlight}</span>
      {after}
    </>
  );
}

export default function ExploreSection({
  type,
  params = {},
  titleKey,
  titleFallbackKey,
  titleHighlight,
  onNavigate,
}: ExploreSectionProps) {
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();
  const navigate = useNavigate();
  const { books, loading, error, retry, isFallback } = useExploreSection(type, params, lang, 6);

  const resolvedTitleKey = isFallback && titleFallbackKey ? titleFallbackKey : titleKey;
  const title = resolvedTitleKey
    ? t(resolvedTitleKey, {
        title: params.referenceBookTitle,
        genre: params.favoriteGenreLabel ?? params.favoriteGenre,
        author: params.favoriteAuthorName,
      })
    : "";

  const handleSeeMore = () => {
    onNavigate?.();
    navigate(buildSectionUrl(type, params));
  };

  if (!loading && !error && books.length === 0) return null;

  return (
    <section className="explore-section">
      <div className="explore-section__header">
        <h2 className="explore-section__title">{renderTitle(title, titleHighlight)}</h2>
        {!loading && !error && books.length > 0 && (
          <button
            type="button"
            className="explore-section__see-more"
            onClick={handleSeeMore}
          >
            {t("explore.seeMore")} <ChevronRight />
          </button>
        )}
      </div>

      {loading && <ExploreGridSkeleton />}

      {error && (
        <div className="explore-section__error">
          <p className="explore-section__error-text">{t("explore.sectionError")}</p>
          <button type="button" className="explore-section__retry" onClick={retry}>
            {t("explore.retry")}
          </button>
        </div>
      )}

      {!loading && !error && books.length > 0 && (
        <div className="explore-section__grid">
          {books.map(book => (
            <BookGridCard key={book.key} book={book} />
          ))}
        </div>
      )}
    </section>
  );
}
