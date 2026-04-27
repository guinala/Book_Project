import { useTranslation } from "react-i18next";
import ListCard from "@/components/ListCard/ListCard";
import type { ReadingList } from "@/components/ListCard/ListCard";
import "./ListsSection.scss";

const MAX_LISTS = 3;

function ChevronRightSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
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
  const visibleLists = lists.slice(0, MAX_LISTS);
  const showAddRow = visibleLists.length < MAX_LISTS;

  return (
    <section className="lists-section">
      <div className="lists-section__header">
        <h3 className="lists-section__title">{t("myLibrary.listsTitle")}</h3>
        <a href="#" className="lists-section__see-all">
          {t("myLibrary.seeAll")} <ChevronRightSmall />
        </a>
      </div>

      <div className="lists-section__card">
        {visibleLists.map((list, i) => (
          <div key={list.id}>
            {i > 0 && <div className="lists-section__divider" />}
            <ListCard list={list} />
          </div>
        ))}

        {showAddRow && (
          <>
            {visibleLists.length > 0 && <div className="lists-section__divider" />}
            <button type="button" className="lists-section__create">
              <div className="lists-section__create-icon">
                <PlusIcon />
              </div>
              <span className="lists-section__create-text">
                {t("myLibrary.createList")}
              </span>
              <ChevronRightSmall />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
