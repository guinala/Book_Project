import { useNavigate, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import { useExploreSection } from "@/hooks/useExploreSection";
import BookGridCard from "@/components/book/cards/BookGridCard";
import ExploreGridSkeleton from "@/components/explore/ExploreGridSkeleton";
import type { ExploreSectionParams, ExploreSectionType } from "@/types/ExploreTypes";
import "./ExploreSectionPage.scss";

const SECTION_TITLE_KEYS: Record<ExploreSectionType, string> = {
  "trending": "explore.sections.trending",
  "top-rated": "explore.sections.topRated",
  "fiction": "explore.sections.fiction",
  "non-fiction": "explore.sections.nonFiction",
  "new-releases": "explore.sections.newReleases",
  "quick-reads": "explore.sections.quickReads",
  "because-reading": "explore.sections.becauseReading",
  "more-genre": "explore.sections.moreGenre",
  "new-releases-for-you": "explore.sections.newReleasesForYou",
  "waiting": "explore.sections.waiting",
  "more-author": "explore.sections.moreAuthor",
};

const SECTION_FALLBACK_KEYS: Partial<Record<ExploreSectionType, string>> = {
  "trending": "explore.sections.trendingFallback",
  "new-releases-for-you": "explore.sections.newReleasesFallback",
};

export default function ExploreSectionPage() {
  const { type } = useParams<{ type: string }>();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();
  const navigate = useNavigate();

  const sectionType = type as ExploreSectionType;

  const params: ExploreSectionParams = {
    referenceBookKey: searchParams.get("bookKey") ?? undefined,
    referenceBookTitle: searchParams.get("bookTitle") ?? undefined,
    referenceGenre: searchParams.get("genre") ?? undefined,
    favoriteGenre: searchParams.get("genre") ?? undefined,
    favoriteAuthorKey: searchParams.get("authorKey") ?? undefined,
    favoriteAuthorName: searchParams.get("authorName") ?? undefined,
    userAuthorKeys: searchParams.get("authorKeys")?.split(",").filter(Boolean) ?? undefined,
  };

  const { books, loading, error, retry, isFallback } = useExploreSection(
    sectionType,
    params,
    lang,
    24,
  );

  const titleKey = isFallback && SECTION_FALLBACK_KEYS[sectionType]
    ? SECTION_FALLBACK_KEYS[sectionType]!
    : (SECTION_TITLE_KEYS[sectionType] ?? "");

  const title = t(titleKey, {
    title: params.referenceBookTitle,
    genre: params.favoriteGenre,
    author: params.favoriteAuthorName,
  });

  return (
    <div className="section-page">
      <div className="section-page__header">
        <button
          type="button"
          className="section-page__back"
          onClick={() => navigate(-1)}
        >
          {t("explore.backBtn")}
        </button>
        <h1 className="section-page__title">{title}</h1>
      </div>

      {loading && <ExploreGridSkeleton />}

      {error && (
        <div className="section-page__error">
          <p>{t("explore.sectionError")}</p>
          <button type="button" onClick={retry}>
            {t("explore.retry")}
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="section-page__grid">
          {books.map(book => (
            <BookGridCard key={book.key} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
