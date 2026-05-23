import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { genreToColorVar, genreToI18nKey } from "@/utils/genreUtils";
import "./GenreSection.scss";

const EXPLORE_GENRES = [
  "Fiction",
  "Non-Fiction",
  "Mystery and detective stories",
  "Romance",
  "Science Fiction",
  "Historical Fiction",
  "Fantasy",
  "Thriller",
];

type Props = {
  featuredGenre: string;
};

export default function GenreSection({ featuredGenre }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const safeFeaturedGenre = EXPLORE_GENRES.includes(featuredGenre) ? featuredGenre : "Fiction";
  const otherGenres = EXPLORE_GENRES.filter(g => g !== safeFeaturedGenre);

  const handleClick = (genre: string) => {
    const label = t(`book.genres.${genreToI18nKey(genre)}`, { defaultValue: genre });
    navigate(`/explore/section/more-genre?genre=${encodeURIComponent(genre)}&genreLabel=${encodeURIComponent(label)}`);
  };

  return (
    <section className="genre-section">
      <div className="genre-section__header">
        <h2 className="genre-section__title">{t("explore.sections.genreGrid")}</h2>
      </div>
      <div className="genre-section__grid">
        <button
          type="button"
          className="genre-section__tile genre-section__tile--hero"
          style={{ background: genreToColorVar(safeFeaturedGenre) }}
          onClick={() => handleClick(safeFeaturedGenre)}
        >
          <span className="genre-section__tile-title">
            {t(`book.genres.${genreToI18nKey(safeFeaturedGenre)}`, { defaultValue: safeFeaturedGenre })}
          </span>
        </button>

        {otherGenres.slice(0, 6).map(genre => (
          <button
            key={genre}
            type="button"
            className="genre-section__tile"
            style={{ background: genreToColorVar(genre) }}
            onClick={() => handleClick(genre)}
          >
            <span className="genre-section__tile-name">
              {t(`book.genres.${genreToI18nKey(genre)}`, { defaultValue: genre })}
            </span>
          </button>
        ))}

      </div>
    </section>
  );
}
