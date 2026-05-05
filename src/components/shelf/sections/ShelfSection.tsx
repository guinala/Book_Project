import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ShelfBookCard from "@/components/shelf/cards/ShelfBookCard";
import type { Book } from "@/types/Book";
import "./ShelfSection.scss";
import type { ShelfStatus } from "@/types/BookDetail";

const SHELF_FILTER_KEYS = ["wantToRead", "reading", "finished", "didNotFinish"] as const;
type ShelfFilterKey = (typeof SHELF_FILTER_KEYS)[number];

const PAGE_SIZE = 7;

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
  loading?: boolean;
  readOnly?: boolean;
  onSeeAll?: () => void;
};

export default function ShelfSection({ books, loading = false, readOnly = false, onSeeAll }: ShelfSectionProps) {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<ShelfFilterKey>(SHELF_FILTER_KEYS[0]);
  const [page, setPage] = useState(0);

  const categoryBooks = books[activeFilter];

  // +1 slot for the add-book card so it always occupies its own fixed position
  const totalPages = Math.ceil((categoryBooks.length + (readOnly ? 0 : 1)) / PAGE_SIZE);
  const isLastPage = page === totalPages - 1;

  const slots: Slot[] = useMemo(() => Array.from({ length: PAGE_SIZE }, (_, i) => {
    const idx = page * PAGE_SIZE + i;
    if (idx < categoryBooks.length) return { type: "book", book: categoryBooks[idx] };
    if (!readOnly && idx === categoryBooks.length) return { type: "add" };
    return { type: "spacer" };
  }), [categoryBooks, page, readOnly]);

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
        {onSeeAll && (
          <button
            type="button"
            className="shelf-section__see-all"
            onClick={onSeeAll}
          >
            {t("myLibrary.seeAll")} <ChevronRightSmall />
          </button>
        )}
      </div>

      <div className="shelf-section__card">
        {!loading && categoryBooks.length === 0 ? (
          <div className="shelf-section__empty">
            {!readOnly && (
              <div className="shelf-section__empty-icon">
                <PlusIcon />
              </div>
            )}
            <p className="shelf-section__empty-text">
              {readOnly ? "Sin libros en esta estantería" : t("myLibrary.emptyShelf")}
            </p>
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
                          <div className="shelf-section__add-book-inner" aria-hidden="true" />
                          <p className="shelf-section__add-book-ghost-title" aria-hidden="true">&nbsp;</p>
                          <p className="shelf-section__add-book-ghost-author" aria-hidden="true">&nbsp;</p>
                          <div className="shelf-section__add-book-content">
                            <div className="shelf-section__add-book-icon">
                              <PlusIcon />
                            </div>
                            <p className="shelf-section__add-book-text">{t("myLibrary.emptyShelf")}</p>
                          </div>
                        </div>
                      </div>
                    );
                    return <div key={`spacer-${i}`} className="shelf-section__item shelf-section__item--spacer" />;
                  })
              }
            </div>
            {totalPages > 1 && (
              <div className="shelf-section__chevron-area">
                <button
                  className="shelf-section__chevron"
                  onClick={handleChevron}
                >
                  {isLastPage ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
