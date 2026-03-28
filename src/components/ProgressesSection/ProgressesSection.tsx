import "./ProgressesSection.scss";

const weekActivity = [
  { day: "LU", pages: 22 },
  { day: "MA", pages: 38 },
  { day: "MI", pages: 14 },
  { day: "JU", pages: 54 },
  { day: "VI", pages: 30 },
  { day: "SÁ", pages: 46 },
  { day: "DO", pages: 18, today: true },
];

const genres = [
  { name: "Fantasía",  pct: 42, color: "var(--color-accent)" },
  { name: "Drama",     pct: 20, color: "var(--color-text-secondary)" },
  { name: "Histórica", pct: 18, color: "var(--color-genre-historical)" },
  { name: "Otros",     pct: 12, color: "var(--color-text-tertiary)" },
];

export default function ProgressesSection() {
  const maxPages = Math.max(...weekActivity.map((d) => d.pages));

  return (
    <section className="progresses">
      <h3 className="progresses__title">Progresos</h3>

      <div className="progresses__grid">
        <div className="progresses__card">
          <p className="progresses__card-title">Meta anual</p>
          <div className="progresses__goal-outer">
            <div className="progresses__goal-inner">
              <span className="progresses__goal-number">20/20</span>
              <span className="progresses__goal-label">libros</span>
            </div>
          </div>
          <p className="progresses__goal-completed">¡Completado!</p>
        </div>

        <div className="progresses__card">
          <p className="progresses__card-title">Actividad semanal</p>
          <div className="progresses__bar-chart">
            {weekActivity.map(({ day, pages, today }) => (
              <div key={day} className="progresses__bar-col">
                <div
                  className={`progresses__bar${today ? " progresses__bar--today" : ""}`}
                  style={{ height: `${(pages / maxPages) * 64}px` }}
                />
                <span className={`progresses__bar-label${today ? " progresses__bar-label--today" : ""}`}>
                  {day}
                </span>
              </div>
            ))}
          </div>
          <div className="progresses__chart-stats">
            <div className="progresses__stat">
              <span className="progresses__stat-num">236</span>
              <span className="progresses__stat-label">págs. semana</span>
            </div>
            <div className="progresses__stat">
              <span className="progresses__stat-num">34</span>
              <span className="progresses__stat-label">págs. hoy</span>
            </div>
            <div className="progresses__stat">
              <span className="progresses__stat-num progresses__stat-num--green">↑12%</span>
              <span className="progresses__stat-label">semana pasada</span>
            </div>
          </div>
        </div>

        <div className="progresses__card">
          <p className="progresses__card-title">Géneros favoritos</p>
          <div className="progresses__genres">
            {genres.map(({ name, pct, color }) => (
              <div key={name} className="progresses__genre">
                <div className="progresses__genre-row">
                  <span className="progresses__genre-name">{name}</span>
                  <span className="progresses__genre-pct">{pct}%</span>
                </div>
                <div className="progresses__genre-track">
                  <div
                    className="progresses__genre-fill"
                    style={{ width: `${pct}%`, background: color }}
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
