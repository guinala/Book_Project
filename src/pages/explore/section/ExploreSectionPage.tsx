import { useNavigate, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import { useSectionBooks } from "../hooks/useSectionBooks";
import BookCard from "@/components/book/cards/BookCard";
import ExploreGridSkeleton from "@/components/explore/ExploreGridSkeleton";
import type { ExploreSectionParams, ExploreSectionType } from "@/types/ExploreTypes";
import { moreGenreTitleKey } from "@/utils/genreUtils";
import { ChevronLeft } from "lucide-react";
import "./ExploreSectionPage.scss";
import { useExploreCache } from "@/context/explore-cache/useExploreCache";
import { useShelfDerivedFavorites } from "@/pages/explore/hooks/useShelfDerivedFavorites";
import { useEffect } from "react";

const SECTION_TITLE_KEYS: Record<ExploreSectionType, string> = {
  "trending": "explore.sections.trending",
  "acclaimed": "explore.sections.acclaimed",
  "top-rated": "explore.sections.topRated",
  "because-reading": "explore.sections.becauseReading",
  "because-liked": "explore.sections.becauseLiked",
  "because-finished": "explore.sections.becauseFinished",
  "because-favorites": "explore.sections.becauseFavorites",
  "more-genre": "explore.sections.moreGenre",
  "more-author": "explore.sections.moreAuthor",
  "new-releases-for-you": "explore.sections.newReleasesForYou",
  "waiting": "explore.sections.waiting",
  "genre-grid": "explore.sections.genreGrid",
  "top-genre": "explore.sections.topGenre",
};

const SECTION_FALLBACK_KEYS: Partial<Record<ExploreSectionType, string>> = {
  "trending": "explore.sections.trendingFallback",
  "new-releases-for-you": "explore.sections.newReleasesFallback",
};

function renderTitle(title: string, highlight: string | undefined) {
  if (!highlight || !title.includes(highlight)) return title;
  const [before, after] = title.split(highlight);
  return (
    <>
      {before}
      <span className="section-page__title-accent">{highlight}</span>
      {after}
    </>
  );
}

export default function ExploreSectionPage() {
  const { type } = useParams<{ type: string }>();
  const { clearIfDirty } = useExploreCache();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { lang } = useCurrentLanguage();
  const navigate = useNavigate();

  const sectionType = type as ExploreSectionType;
  const shelfDerived = useShelfDerivedFavorites();

  const favoriteGenreLabel = searchParams.get("genreLabel") ?? undefined;

  const params: ExploreSectionParams = {
    referenceBookKey: searchParams.get("bookKey") ?? undefined,
    referenceBookTitle: searchParams.get("bookTitle") ?? undefined,
    referenceGenre: searchParams.get("genre") ?? undefined,
    favoriteGenre: searchParams.get("genre") ?? undefined,
    favoriteGenreLabel,
    favoriteAuthorKey: searchParams.get("authorKey") ?? undefined,
    favoriteAuthorName: searchParams.get("authorName") ?? undefined,
    userAuthorKeys: searchParams.get("authorKeys")?.split(",").filter(Boolean) ?? undefined,
    wantToReadBooks: sectionType === "waiting" ? (shelfDerived?.wantToReadBooks ?? []) : undefined,
  };

  const isWaiting = sectionType === "waiting";
  const { books: fetchedBooks, loading: fetchLoading, error, retry, isFallback } = useSectionBooks(
    sectionType,
    params,
    lang,
    24,
    isWaiting,
  );

  const books = isWaiting ? (shelfDerived?.wantToReadBooks ?? []) : fetchedBooks;
  const loading = isWaiting ? shelfDerived === null : fetchLoading;

  const titleKey = isFallback && SECTION_FALLBACK_KEYS[sectionType]
    ? SECTION_FALLBACK_KEYS[sectionType]!
    : sectionType === "more-genre"
      ? moreGenreTitleKey(params.favoriteGenre)
      : (SECTION_TITLE_KEYS[sectionType] ?? "");

  const title = t(titleKey, {
    title: params.referenceBookTitle,
    genre: params.favoriteGenreLabel ?? params.favoriteGenre,
    author: params.favoriteAuthorName,
  });

  const titleHighlight =
    (sectionType === "because-reading" ||
     sectionType === "because-liked" ||
     sectionType === "because-finished" ||
     sectionType === "because-favorites") ? params.referenceBookTitle :
    sectionType === "more-genre" ? (params.favoriteGenreLabel ?? params.favoriteGenre) :
    sectionType === "more-author" ? params.favoriteAuthorName :
    undefined;


  useEffect(() => {
    clearIfDirty();
  }, [clearIfDirty]);

  return (
    <div className="section-page">
      <div className="section-page__header">
        <button
          type="button"
          className="section-page__back"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft aria-hidden="true" />
          {t("explore.backBtn")}
        </button>
        <h2 className="section-page__title">{renderTitle(title, titleHighlight)}</h2>
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
            <BookCard key={book.key} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
