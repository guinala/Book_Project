import { Fragment } from "react";
import { moreGenreTitleKey } from "@/utils/genreUtils";
import ExploreSection from "@/components/explore/ExploreSection";
import TrendingSection from "@/components/explore/TrendingSection";
import ExploreGridSkeleton from "@/components/explore/ExploreGridSkeleton";
import GenreSection from "@/components/explore/GenreSection";
import type { SectionEntry } from "@/hooks/useExploreFeed";
import type { ExploreSectionParams, ExploreSectionType } from "@/types/ExploreTypes";
import type { ShelfDerived } from "@/hooks/useShelfDerivedFavorites";

const FEATURED_SECTION_TYPES = new Set<ExploreSectionType>([
  "because-liked", "because-finished", "new-releases-for-you",
]);

function truncate(text: string, max = 40): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function buildParamsForEntry(entry: SectionEntry, shelf: ShelfDerived): ExploreSectionParams {
  return {
    userShelfKeys: shelf.userShelfKeys,
    userAuthorKeys: shelf.userAuthorKeys,
    referenceBookKey: entry.referenceBookKey,
    referenceBookTitle: entry.referenceBookTitle,
    referenceGenre: entry.referenceGenre,
    favoriteGenre: entry.favoriteGenre,
    favoriteGenreLabel: entry.favoriteGenreLabel,
    favoriteAuthorKey: entry.favoriteAuthorKey,
    favoriteAuthorName: entry.favoriteAuthorName,
  };
}

function titleKeyForEntry(entry: SectionEntry): string {
  if (entry.type === "more-genre") return moreGenreTitleKey(entry.favoriteGenre);
  const map: Partial<Record<ExploreSectionType, string>> = {
    "trending": "explore.sections.trending",
    "because-reading": "explore.sections.becauseReading",
    "because-liked": "explore.sections.becauseLiked",
    "because-finished": "explore.sections.becauseFinished",
    "because-favorites": "explore.sections.becauseFavorites",
    "acclaimed": "explore.sections.acclaimed",
    "top-genre": "explore.sections.topGenre",
    "new-releases-for-you": "explore.sections.newReleasesForYou",
    "waiting": "explore.sections.waiting",
    "more-author": "explore.sections.moreAuthor",
  };
  return map[entry.type] ?? "explore.sections.trending";
}

function titleHighlightForEntry(entry: SectionEntry): string | undefined {
  if (entry.referenceBookTitle) return truncate(entry.referenceBookTitle);
  if (entry.favoriteGenreLabel ?? entry.favoriteGenre) return entry.favoriteGenreLabel ?? entry.favoriteGenre ?? undefined;
  if (entry.favoriteAuthorName) return entry.favoriteAuthorName;
  return undefined;
}

type Props = {
  sections: SectionEntry[];
  loading: boolean;
  shelfDerived: ShelfDerived;
  onNavigate: () => void;
};

export default function ExploreSectionsList({ sections, loading, shelfDerived, onNavigate }: Props) {
  if (loading) {
    return (
      <>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="explore-page__skeleton-section">
            <div className="explore-page__skeleton-title" />
            <ExploreGridSkeleton />
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {sections.map((entry) => (
        <Fragment key={entry.id}>
          {entry.type === "genre-grid" ? (
            <>
              <GenreSection featuredGenre={shelfDerived.favoriteGenre ?? "Fiction"} />
              <ExploreSection
                type="acclaimed"
                titleKey="explore.sections.acclaimed"
                featured
                onNavigate={onNavigate}
              />
            </>
          ) : entry.type === "trending" ? (
            <TrendingSection
              books={entry.books}
              isFallback={entry.isFallback}
              params={buildParamsForEntry(entry, shelfDerived)}
              onNavigate={onNavigate}
            />
          ) : (
            <ExploreSection
              type={entry.type}
              override={{ books: entry.books, isFallback: entry.isFallback }}
              params={buildParamsForEntry(entry, shelfDerived)}
              titleKey={titleKeyForEntry(entry)}
              titleFallbackKey={entry.type === "new-releases-for-you" ? "explore.sections.newReleasesFallback" : undefined}
              titleHighlight={titleHighlightForEntry(entry)}
              featured={FEATURED_SECTION_TYPES.has(entry.type)}
              onNavigate={onNavigate}
            />
          )}
        </Fragment>
      ))}
    </>
  );
}
