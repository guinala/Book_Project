import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ShelfBookCard from "@/components/ShelfBookCard/ShelfBookCard";
import type { Book } from "@/types/Book";
import "./ShelfSection.scss";
import type { ShelfStatus } from "@/types/BookDetail";

const SHELF_FILTER_KEYS = ["wantToRead", "reading", "finished", "didNotFinish"] as const;
type ShelfFilterKey = (typeof SHELF_FILTER_KEYS)[number];

const PAGE_SIZE = 7;
const CATEGORY_COUNT = 4;
const BOOKS_PER_CATEGORY = PAGE_SIZE * 2;

const CATEGORY_INDEX: Record<ShelfFilterKey, number> = {
  wantToRead: 0,
  reading: 1,
  finished: 2,
  didNotFinish: 3,
};

type Slot = { type: "book"; book: Book } | { type: "add" } | { type: "spacer" };

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

function ChevronRightSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

type ShelfSectionProps = {
  books: Record<ShelfStatus, Book[]>;
};

export default function ShelfSection({ books, loading = false }: ShelfSectionProps) {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<ShelfFilterKey>(SHELF_FILTER_KEYS[0]);
  const [page, setPage] = useState(0);

  const shuffledCategories = useMemo(() => {
    const shuffled = [...books];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return Array.from({ length: CATEGORY_COUNT }, (_, i) =>
      shuffled.slice(i * BOOKS_PER_CATEGORY, (i + 1) * BOOKS_PER_CATEGORY)
    );
  }, [books]);

  const categoryIndex = CATEGORY_INDEX[activeFilter];
  const categoryBooks = shuffledCategories[categoryIndex];

  // +1 slot for the add-book card so it always occupies its own fixed position
  const totalPages = Math.ceil((categoryBooks.length + 1) / PAGE_SIZE);
  const isLastPage = page === totalPages - 1;

  const slots: Slot[] = useMemo(() => Array.from({ length: PAGE_SIZE }, (_, i) => {
    const idx = page * PAGE_SIZE + i;
    if (idx < categoryBooks.length) return { type: "book", book: categoryBooks[idx] };
    if (idx === categoryBooks.length) return { type: "add" };
    return { type: "spacer" };
  }), [categoryBooks, page]);

  function handleFilterChange(key: ShelfFilterKey) {
    setActiveFilter(key);
    setPage(0);
  }

  function handleChevron() {
    setPage(p => (p + 1) % totalPages);
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
              <span className="shelf-section__filter-count">{books[key].length}</span>
            </button>
          ))}
        </div>
        <a href="#" className="shelf-section__see-all">
          {t("myLibrary.seeAll")} <ChevronRightSmall />
        </a>
      </div>

      <div className="shelf-section__card">
        <div className="shelf-section__track">
          {books[activeFilter].map((book) => (
            <div key={book.key} className="shelf-section__item">
              <ShelfBookCard book={book} />
        {categoryBooks.length === 0 ? (
          <div className="shelf-section__empty">
            <div className="shelf-section__empty-icon">
              <PlusIcon />
            </div>
            <p className="shelf-section__empty-text">{t("myLibrary.emptyShelf")}</p>
          </div>
        ) : (
          <>
            <div className="shelf-section__track">
              {loading
                ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <div key={i} className="shelf-section__item shelf-section__item--skeleton" />
                  ))
                : slots.map((slot, i) => {
                    if (slot.type === "book") return (
                      <div key={slot.book.key} className="shelf-section__item">
                        <ShelfBookCard book={slot.book} />
                      </div>
                    );
                    if (slot.type === "add") return (
                      <div key="add" className="shelf-section__item">
                        <div className="shelf-section__add-book">
                          <div className="shelf-section__add-book-icon">
                            <PlusIcon />
                          </div>
                          <p className="shelf-section__add-book-text">{t("myLibrary.emptyShelf")}</p>
                        </div>
                      </div>
                    );
                    return <div key={`spacer-${i}`} className="shelf-section__item shelf-section__item--spacer" />;
                  })
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
          </>
        )}
      </div>
    </section>
  );
}
