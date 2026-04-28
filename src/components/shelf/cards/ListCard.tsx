import { useTranslation } from "react-i18next";
import "./ListCard.scss";

export type ReadingList = {
  id: string;
  nameKey: string;
  count: number;
  coverUrls: string[];
};

type ListCardProps = {
  list: ReadingList;
};

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function ListCard({ list }: ListCardProps) {
  const { t } = useTranslation();
  const covers = list.coverUrls.slice(0, 4);

  return (
    <article className="list-card">
      <div className="list-card__mosaic">
        {covers.map((url, i) => (
          <div key={i} className="list-card__mosaic-cell">
            <img className="list-card__mosaic-img" src={url} alt="" loading="lazy" />
          </div>
        ))}
      </div>

      <div className="list-card__meta">
        <p className="list-card__name">{t(list.nameKey)}</p>
        <p className="list-card__count">
          {t("myLibrary.listsCount", { count: list.count })}
        </p>
      </div>

      <span className="list-card__chevron">
        <ChevronRight />
      </span>
    </article>
  );
}
