import { useTranslation } from "react-i18next";
import "./ProgressSection.scss";

export default function ProgressSection() {
  const { t } = useTranslation();

  const weekActivity = [
    { day: t("myLibrary.days.mon"), pages: 22 },
    { day: t("myLibrary.days.tue"), pages: 38 },
    { day: t("myLibrary.days.wed"), pages: 14 },
    { day: t("myLibrary.days.thu"), pages: 54 },
    { day: t("myLibrary.days.fri"), pages: 30 },
    { day: t("myLibrary.days.sat"), pages: 46 },
    { day: t("myLibrary.days.sun"), pages: 18, currentDay: true },
  ];

  const genres = [
    { key: "fantasy",    percentage: 42, color: "var(--color-accent)" },
    { key: "drama",      percentage: 20, color: "var(--color-text-secondary)" },
    { key: "historical", percentage: 18, color: "var(--color-genre-historical)" },
    { key: "others",     percentage: 12, color: "var(--color-text-tertiary)" },
  ];

  const maxPages = Math.max(...weekActivity.map((d) => d.pages));

  return (
    <section className="progresses">
      <h3 className="progresses__title">{t("myLibrary.progress.title")}</h3>

      <div className="progresses__grid">
        <div className="progresses__card">
          <p className="progresses__card-title">{t("myLibrary.progress.annualGoal")}</p>
          <div className="progresses__goal-outer">
            <div className="progresses__goal-inner">
              <span className="progresses__goal-number">20/20</span>
              <span className="progresses__goal-label">{t("myLibrary.progress.books")}</span>
            </div>
          </div>
          <p className="progresses__goal-completed">{t("myLibrary.progress.completed")}</p>
        </div>

        <div className="progresses__card">
          <p className="progresses__card-title">{t("myLibrary.progress.weeklyActivity")}</p>
          <div className="progresses__bar-chart">
            {weekActivity.map(({ day, pages, currentDay }) => (
              <div key={day} className="progresses__bar-col">
                <div
                  className={`progresses__bar${currentDay ? " progresses__bar--currentDay" : ""}`}
                  style={{ height: `${(pages / maxPages) * 64}px` }}
                />
                <span className={`progresses__bar-label${currentDay ? " progresses__bar-label--currentDay" : ""}`}>
                  {day}
                </span>
              </div>
            ))}
          </div>
          <div className="progresses__chart-stats">
            <div className="progresses__stat">
              <span className="progresses__stat-num">236</span>
              <span className="progresses__stat-label">{t("myLibrary.progress.pagesWeek")}</span>
            </div>
            <div className="progresses__stat">
              <span className="progresses__stat-num">34</span>
              <span className="progresses__stat-label">{t("myLibrary.progress.pagesToday")}</span>
            </div>
            <div className="progresses__stat">
              <span className="progresses__stat-num progresses__stat-num--green">↑12%</span>
              <span className="progresses__stat-label">{t("myLibrary.progress.lastWeek")}</span>
            </div>
          </div>
        </div>

        <div className="progresses__card">
          <p className="progresses__card-title">{t("myLibrary.progress.favoriteGenres")}</p>
          <div className="progresses__genres">
            {genres.map(({ key, percentage, color }) => (
              <div key={key} className="progresses__genre">
                <div className="progresses__genre-row">
                  <span className="progresses__genre-name">{t(`myLibrary.genres.${key}`)}</span>
                  <span className="progresses__genre-percentage">{percentage}%</span>
                </div>
                <div className="progresses__genre-track">
                  <div
                    className="progresses__genre-fill"
                    style={{ width: `${percentage}%`, background: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
