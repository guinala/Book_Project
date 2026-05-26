import ExploreSection from "@/components/explore/ExploreSection";
import TrendingSection from "@/components/explore/TrendingSection";
import GenreSection from "@/components/explore/GenreSection";
import ExploreConversionBanner from "@/components/explore/ExploreConversionBanner";
import type { ExploreSectionParams } from "@/types/ExploreTypes";

type Props = {
  showConversionBanner: boolean;
  shelfParams: Partial<ExploreSectionParams>;
  onNavigate: () => void;
};

export default function ExploreGuestSections({ showConversionBanner, shelfParams, onNavigate }: Props) {
  return (
    <>
      <TrendingSection params={shelfParams} onNavigate={onNavigate} />
      <ExploreSection
        type="acclaimed"
        titleKey="explore.sections.acclaimed"
        featured
        onNavigate={onNavigate}
      />
      {showConversionBanner && <ExploreConversionBanner />}
      <GenreSection featuredGenre="Fiction" />
      <ExploreSection
        type="more-author"
        titleKey="explore.sections.moreAuthor"
        onNavigate={onNavigate}
      />
    </>
  );
}
