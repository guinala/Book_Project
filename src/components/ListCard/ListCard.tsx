import { useTranslation } from "react-i18next";
import "./ListCard.scss";

export type ReadingList = {
  id: string;
  nameKey: string;
  count: number;
  coverUrls: string[];
}

type ListCardProps = {
  list: ReadingList;
}

export default function ListCard({ list }: ListCardProps) {
  const { t } = useTranslation();
  const covers = list.coverUrls.slice(0, 4);

  return (
    <article className="list-card">
      <div className="list-card__mosaic">
        {covers.map((url, i) => (
          <div key={i} className="list-card__mosaic-cell">
            <img
              className="list-card__mosaic-img"
              src={url}
              alt=""
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <div className="list-card__meta">
        <p className="list-card__name">{t(list.nameKey)}</p>
        <p className="list-card__count">
          {t("myLibrary.listsCount", { count: list.count })}
        </p>
      </div>
    </article>
  );
}