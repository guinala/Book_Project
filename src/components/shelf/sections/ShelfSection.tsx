import { useMemo, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link } from "react-router";
import BookTile from "@/components/shelf/cards/BookTile";
import type { Book } from "@/types/Book";
import "./ShelfSection.scss";
import type { ShelfStatus } from "@/types/BookDetail";
import { ChevronRight, ChevronLeft, Plus } from "lucide-react";

const SHELF_FILTER_KEYS = ["wantToRead", "reading", "finished", "didNotFinish"] as const;
type ShelfFilterKey = (typeof SHELF_FILTER_KEYS)[number];

const PAGE_SIZE = 14;
const COLUMNS = 7;

type Slot = { type: "book"; book: Book } | { type: "add" };

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

  // Slot extra (+1) para que la card de añadir libro siempre tenga una posición fija
  const totalPages = Math.ceil((categoryBooks.length + (readOnly ? 0 : 1)) / PAGE_SIZE);
  const isLastPage = page === totalPages - 1;

  const slots: Slot[] = useMemo(() => {
    const result: Slot[] = [];
    for (let i = 0; i < PAGE_SIZE; i++) {
      const idx = page * PAGE_SIZE + i;
      if (idx < categoryBooks.length) {
        result.push({ type: "book", book: categoryBooks[idx] });
      } else if (!readOnly && idx === categoryBooks.length) {
        result.push({ type: "add" });
        break;
      } else {
        break;
      }
    }
    return result;
  }, [categoryBooks, page, readOnly]);

  // Durante loading mostramos las 2 filas de skeletons; si no, se adapta a los slots reales
  const singleRow = !loading && slots.length <= COLUMNS;

  function handleFilterChange(key: ShelfFilterKey) {
    setActiveFilter(key);
    setPage(0);
  }

  function handleChevron() {
    setPage(p => (p + 1) % totalPages);
  }

  return (
    <section className="shelf-section">
      <h2 className="shelf-section__title">{t("myLibrary.shelfTitle")}</h2>

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
          <a
            role="button"
            className="shelf-section__see-all"
            onClick={onSeeAll}
            style={{ cursor: "pointer" }}
          >
            {t("myLibrary.seeAll")} <ChevronRight size={14} aria-hidden="true" />
          </a>
        )}
      </div>

      <div className="shelf-section__card">
        {!loading && categoryBooks.length === 0 && readOnly ? (
          <p className="shelf-section__empty-readonly">{t("myLibrary.emptyShelfReadonly")}</p>
        ) : !loading && categoryBooks.length === 0 ? (
          <div className="shelf-section__empty-state">
            <p className="shelf-section__empty-state-text">
              <Trans i18nKey="myLibrary.emptyShelfCategory">
                Esta categoría está vacía. ¡Añade libros desde <Link to="/explore">Explorar</Link>!
              </Trans>
            </p>
          </div>
        ) : (
          <>
            <div className={`shelf-section__track ${singleRow ? "shelf-section__track--single-row" : ""}`}>
              {loading
                ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <div key={i} className="shelf-section__item shelf-section__item--skeleton" />
                  ))
                : slots.map((slot) => {
                    if (slot.type === "book") return (
                      <div key={slot.book.key} className="shelf-section__item">
                        <BookTile book={slot.book} />
                      </div>
                    );
                    return (
                      <div key="add" className="shelf-section__item">
                        <div className="shelf-section__add-book">
                          <div className="shelf-section__add-book-cover">
                            <div className="shelf-section__add-book-icon">
                              <Plus />
                            </div>
                          </div>
                          <p className="shelf-section__add-book-title">{t("myLibrary.emptyShelf")}</p>
                          <p className="shelf-section__add-book-author" aria-hidden="true">&nbsp;</p>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
            {totalPages > 1 && (
              <div className="shelf-section__chevron-area">
                <button
                  className="shelf-section__chevron"
                  onClick={handleChevron}
                >
                  {isLastPage ? <ChevronLeft /> : <ChevronRight />}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
