import { useState } from "react";
import { useTranslation } from "react-i18next";
import ShelfBookCard from "@/components/ShelfBookCard/ShelfBookCard";
import type { Book } from "@/types/Book";
import "./ShelfSection.scss";

const SHELF_FILTER_KEYS = ["wantToRead", "reading", "finished", "didNotFinish"] as const;
type ShelfFilterKey = (typeof SHELF_FILTER_KEYS)[number];

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

type ShelfSectionProps = {
  books: Book[];
};

export default function ShelfSection({ books }: ShelfSectionProps) {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<ShelfFilterKey>(SHELF_FILTER_KEYS[0]);

  return (
    <section className="shelf-section">
      <h3 className="shelf-section__title">{t("myLibrary.shelfTitle")}</h3>

      <div className="shelf-section__sub-header">
        <div className="shelf-section__filter-tabs">
          {SHELF_FILTER_KEYS.map((key) => (
            <button
              key={key}
              className={`shelf-section__filter-tab ${activeFilter === key ? "shelf-section__filter-tab--active" : ""}`}
              onClick={() => setActiveFilter(key)}
            >
              {t(`myLibrary.shelf.${key}`)}
              <span className="shelf-section__filter-count">{books.length}</span>
            </button>
          ))}
        </div>
        <a href="#" className="shelf-section__see-all">{t("myLibrary.seeAll")}</a>
      </div>

      <div className="shelf-section__card">
        <div className="shelf-section__track">
          {books.map((book) => (
            <div key={book.key} className="shelf-section__item">
              <ShelfBookCard book={book} />
            </div>
          ))}
        </div>
        <button className="shelf-section__chevron">
          <ChevronRightIcon />
        </button>
      </div>
    </section>
  );
}
