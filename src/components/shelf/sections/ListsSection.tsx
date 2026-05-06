import { useTranslation } from "react-i18next";
import ListCard from "@/components/shelf/cards/ListCard";
import type { ReadingList } from "@/components/shelf/cards/ListCard";
import { ChevronRight, Plus } from "lucide-react";
import "./ListsSection.scss";

const MAX_LISTS = 3;

type ListsSectionProps = {
  lists: ReadingList[];
};

export default function ListsSection({ lists }: ListsSectionProps) {
  const { t } = useTranslation();
  const visibleLists = lists.slice(0, MAX_LISTS);

  return (
    <section className="lists-section">
      <div className="lists-section__header">
        <h3 className="lists-section__title">{t("myLibrary.listsTitle")}</h3>
        <a href="#" className="lists-section__see-all">
          {t("myLibrary.seeAll")} <ChevronRight size={14} aria-hidden="true" />
        </a>
      </div>

      <div className="lists-section__card">
        {visibleLists.map((list, i) => (
          <div key={list.id}>
            {i > 0 && <div className="lists-section__divider" />}
            <ListCard list={list} />
          </div>
        ))}

        {visibleLists.length > 0 && <div className="lists-section__divider" />}
        <button type="button" className="lists-section__create">
          <div className="lists-section__create-icon">
            <Plus size={18} aria-hidden="true" />
          </div>
          <span className="lists-section__create-text">
            {t("myLibrary.createList")}
          </span>
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
