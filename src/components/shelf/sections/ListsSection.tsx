import { useTranslation } from "react-i18next";
import ListCard from "@/components/shelf/cards/ListCard";
import { ChevronRight, Plus } from "lucide-react";
import "./ListsSection.scss";
import type { BookList } from "@/types/BookList";
import { Link } from "react-router";

const PREVIEW_COUNT_GRID = 3;
const PREVIEW_COUNT_COLUMN = 4;

type ListsSectionProps = {
  lists: BookList[];
  userId: string;
  isOwner: boolean;
  onCreateList: () => void;
  column?: boolean;
};

export default function ListsSection({
  lists, userId, isOwner, onCreateList, column = false,
}: ListsSectionProps) {
  const { t } = useTranslation();
  const previewCount = column ? PREVIEW_COUNT_COLUMN : PREVIEW_COUNT_GRID;
  const visibleLists = lists.slice(0, previewCount);

  return (
    <section className="lists-section">
      <div className="lists-section__header">
        <h2 className="lists-section__title">{t("myLibrary.listsTitle")}</h2>
        {(column || lists.length > previewCount) && (
          <Link to={`/lists/${userId}`} className="lists-section__see-all">
            {t("myLibrary.seeAll")} <ChevronRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className={`lists-section__grid${column ? " lists-section__grid--column" : ""}`}>
        {visibleLists.map((list) => (
          <ListCard key={list.id} list={list} userId={userId} />
        ))}

        {isOwner && (
          <button
            type="button"
            className={`lists-section__create${column ? " lists-section__create--column" : ""}`}
            onClick={onCreateList}
          >
            <div className="lists-section__create-icon">
              <Plus size={18} aria-hidden="true" />
            </div>
            <span className="lists-section__create-text">
              {t("myLibrary.createList")}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
