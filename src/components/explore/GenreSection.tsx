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
];

type Props = {
  featuredGenre: string;
};

export default function GenreSection({ featuredGenre }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const otherGenres = EXPLORE_GENRES.filter(g => g !== featuredGenre);

  const handleClick = (genre: string) => {
    navigate(`/explore/section/more-genre?genre=${encodeURIComponent(genre)}`);
  };

  const handleAllClick = () => {
    navigate("/explore/section/more-genre");
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
          style={{ background: genreToColorVar(featuredGenre) }}
          onClick={() => handleClick(featuredGenre)}
        >
          <span className="genre-section__tile-title">
            {t(`book.genres.${genreToI18nKey(featuredGenre)}`, { defaultValue: featuredGenre })}
          </span>
        </button>

        {otherGenres.slice(0, 5).map(genre => (
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

        <button
          type="button"
          className="genre-section__tile genre-section__tile--all"
          onClick={handleAllClick}
        >
          <span className="genre-section__tile-name">
            {t("explore.allGenres")}
          </span>
        </button>
      </div>
    </section>
  );
}
