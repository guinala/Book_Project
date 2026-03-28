import { useTranslation } from "react-i18next";
import ListCard from "@/components/ListCard/ListCard";
import type { ReadingList } from "@/components/ListCard/ListCard";
import "./ListsSection.scss";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

type ListsSectionProps = {
  lists: ReadingList[];
};

export default function ListsSection({ lists }: ListsSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="lists-section">
      <div className="lists-section__header">
        <h3 className="lists-section__title">{t("myLibrary.listsTitle")}</h3>
        <a href="#" className="lists-section__see-all">{t("myLibrary.seeAll")}</a>
      </div>

      <div className="lists-section__row">
        {lists.map((list) => (
          <ListCard key={list.id} list={list} />
        ))}
        <div className="lists-section__create">
          <div className="lists-section__create-icon">
            <PlusIcon />
          </div>
          <p className="lists-section__create-text">{t("myLibrary.createList")}</p>
        </div>
      </div>
    </section>
  );
}
