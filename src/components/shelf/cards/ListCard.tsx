import { useTranslation } from "react-i18next";
import "./ListCard.scss";
import { getListCoverUrls } from "@/utils/bookListUtils";
import { Link } from "react-router";
import type { BookList } from "@/types/BookList";

// export type ReadingList = {
//   id: string;
//   nameKey: string;
//   count: number;
//   coverUrls: string[];
// };

type ListCardProps = {
  list: BookList;
  userId: string;
};

export default function ListCard({ list, userId }: ListCardProps) {
  const { t } = useTranslation();
  //const covers = list.coverUrls.slice(0, 4);
  const covers = getListCoverUrls(list.books);

  return (
    <Link className="list-card" to={`/lists/${userId}/${list.id}`}>
      <div className="list-card__mosaic">
        {covers.map((url, i) => (
          <div key={i} className="list-card__mosaic-cell">
            <img className="list-card__mosaic-img" src={url} alt="" loading="lazy" />
          </div>
        ))}
      </div>

      <div className="list-card__meta">
        <p className="list-card__name">{list.name}</p>
        <p className="list-card__count">
          {t("myLibrary.listsCount", { count: list.books.length })}
        </p>
      </div>
    </Link>
  );
}
