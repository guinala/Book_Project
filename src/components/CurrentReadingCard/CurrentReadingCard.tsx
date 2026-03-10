import { useTranslation } from "react-i18next";
import coverImage from "../../assets/el-nombre-del-viento.jpg";
import "./CurrentReadingCard.scss";

const CURRENT_PAGE = 344;
const TOTAL_PAGES = 540;
const STREAK_DAYS = 12;
const PROGRESS_PERCENT = Math.round((CURRENT_PAGE / TOTAL_PAGES) * 100);

function CurrentReadingCard() {
  const { t } = useTranslation();

  return (
    <article className="reading-card">
      <div className="reading-card__cover">
        <img
          className="reading-card__cover-img"
          src={coverImage}
          alt={t("book.coverAlt", { title: "El nombre del viento" })}
        />
      </div>

      <div className="reading-card__body">
        <div className="reading-card__header">
          <span className="reading-card__streak">
            {t("myLibrary.streakDays", { count: STREAK_DAYS })}
          </span>
          <h3 className="reading-card__title">El nombre del viento</h3>
          <p className="reading-card__author">Patrick Rothfuss</p>
        </div>

        <div className="reading-card__progress-section">
          <div className="reading-card__progress-labels">
            <span className="reading-card__progress-label">
              {t("myLibrary.readingProgress")}
            </span>
            <span className="reading-card__progress-pages">
              {t("myLibrary.pages", { current: CURRENT_PAGE, total: TOTAL_PAGES })}
            </span>
          </div>

          <div className="reading-card__progress-bar-wrapper">
            <div className="reading-card__progress-bar">
              <div
                className="reading-card__progress-fill"
                style={{ width: `${PROGRESS_PERCENT}%` }}
              />
            </div>
            <span className="reading-card__progress-percent">
              {PROGRESS_PERCENT}%
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default CurrentReadingCard;