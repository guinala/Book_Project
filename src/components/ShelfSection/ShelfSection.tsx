import { useState } from "react";
import { useTranslation } from "react-i18next";
import ShelfBookCard from "@/components/ShelfBookCard/ShelfBookCard";
import type { Book } from "@/types/Book";
import "./ShelfSection.scss";

const SHELF_FILTER_KEYS = ["wantToRead", "reading", "finished", "didNotFinish"] as const;
type ShelfFilterKey = (typeof SHELF_FILTER_KEYS)[number];

const PAGE_SIZE = 6;
const CATEGORY_COUNT = 4;

const CATEGORY_INDEX: Record<ShelfFilterKey, number> = {
  wantToRead: 0,
  reading: 1,
  finished: 2,
  didNotFinish: 3,
};

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}

type ShelfSectionProps = {
  books: Book[];
  loading?: boolean;
};

export default function ShelfSection({ books, loading = false }: ShelfSectionProps) {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<ShelfFilterKey>(SHELF_FILTER_KEYS[0]);
  const [page, setPage] = useState(0);

  const categoryIndex = CATEGORY_INDEX[activeFilter];
  const categoryBooks = books.filter((_, i) => i % CATEGORY_COUNT === categoryIndex);
  const totalPages = Math.ceil(categoryBooks.length / PAGE_SIZE);
  const visibleBooks = categoryBooks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const isLastPage = page === totalPages - 1;

  function handleFilterChange(key: ShelfFilterKey) {
    setActiveFilter(key);
    setPage(0);
  }

  function handleChevron() {
    setPage(p => isLastPage ? p - 1 : p + 1);
  }

  return (
    <section className="shelf-section">
      <h3 className="shelf-section__title">{t("myLibrary.shelfTitle")}</h3>

      <div className="shelf-section__sub-header">
        <div className="shelf-section__filter-tabs">
          {SHELF_FILTER_KEYS.map((key) => (
            <button
              key={key}
              className={`shelf-section__filter-tab ${activeFilter === key ? "shelf-section__filter-tab--active" : ""}`}
              onClick={() => handleFilterChange(key)}
            >
              {t(`myLibrary.shelf.${key}`)}
            </button>
          ))}
        </div>
        <a href="#" className="shelf-section__see-all">{t("myLibrary.seeAll")}</a>
      </div>

      <div className="shelf-section__card">
        <div className="shelf-section__track">
          {loading
            ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="shelf-section__item shelf-section__item--skeleton" />
              ))
            : visibleBooks.map((book) => (
                <div key={book.key} className="shelf-section__item">
                  <ShelfBookCard book={book} />
                </div>
              ))
          }
        </div>
        <div className="shelf-section__chevron-area">
          <button
            className="shelf-section__chevron"
            onClick={handleChevron}
            disabled={totalPages <= 1}
          >
            {isLastPage ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </button>
        </div>
      </div>
    </section>
  );
}
