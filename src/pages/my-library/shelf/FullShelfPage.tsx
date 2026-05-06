import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useShelf } from "@/hooks/useShelf";
import { getCoverUrl } from "@/utils/coverImage";
import { encodeKey } from "@/utils/bookPaths";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { Search, Filter, X, ChevronLeft } from "lucide-react";
import "./FullShelfPage.scss";

const SHELF_STATUSES: ShelfStatus[] = ["wantToRead", "reading", "finished", "didNotFinish"];
const SKELETON_COUNT = 14;

function BookTile({ book }: { book: Book }) {
  const navigate = useNavigate();
  const coverSrc = book.cover_url ?? (book.cover_id ? getCoverUrl(book.cover_id) : null);

  return (
    <div
      className="full-shelf__book"
      onClick={() => navigate(`/books/${encodeKey(book.key)}`, { state: { book } })}
    >
      <div className="full-shelf__cover-wrap">
        {coverSrc ? (
          <img className="full-shelf__cover" src={coverSrc} alt={book.title} loading="lazy" />
        ) : (
          <div className="full-shelf__cover-placeholder" />
        )}
      </div>
      <p className="full-shelf__title">{book.title}</p>
      <p className="full-shelf__author">{book.authors.join(", ")}</p>
    </div>
  );
}

export default function FullShelfPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shelfByStatus, loading } = useShelf();
  const [activeStatus, setActiveStatus] = useState<ShelfStatus>("wantToRead");
  const [searchQuery, setSearchQuery] = useState("");

  const isSearching = searchQuery.trim().length > 0;

  const allBooks: Book[] = SHELF_STATUSES.flatMap(s => shelfByStatus[s]);

  const displayBooks = isSearching
    ? allBooks.filter(b => {
        const q = searchQuery.toLowerCase();
        return (
          b.title.toLowerCase().includes(q) ||
          b.authors.some(a => a.toLowerCase().includes(q))
        );
      })
    : shelfByStatus[activeStatus];

  function handleStatusChange(status: ShelfStatus) {
    setActiveStatus(status);
    setSearchQuery("");
  }

  function clearSearch() {
    setSearchQuery("");
  }

  return (
    <main className="full-shelf">

      <div className="full-shelf__header">
        <button type="button" className="full-shelf__back" onClick={() => navigate(-1)}>
          <ChevronLeft aria-hidden="true" />
          {t("explore.backBtn")}
        </button>
        <h1 className="full-shelf__page-title">{t("myLibrary.shelfTitle")}</h1>
      </div>

      <div className="full-shelf__tools">
        <div className="full-shelf__filter-tabs">
          {SHELF_STATUSES.map(status => (
            <button
              key={status}
              type="button"
              className={`full-shelf__filter-tab${!isSearching && activeStatus === status ? " full-shelf__filter-tab--active" : ""}`}
              onClick={() => handleStatusChange(status)}
            >
              {t(`myLibrary.shelf.${status}`)}
              <span className="full-shelf__filter-count">{shelfByStatus[status].length}</span>
            </button>
          ))}
        </div>

        <div className="full-shelf__search-bar">
          <span className="full-shelf__search-icon"><Search aria-hidden="true" /></span>
          <span className="full-shelf__search-divider" />
          <input
            type="text"
            placeholder={t("myLibrary.searchPlaceholder")}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {isSearching && (
            <button
              type="button"
              className="full-shelf__clear-btn"
              onClick={clearSearch}
              aria-label={t("myLibrary.clearSearch")}
            >
              <X aria-hidden="true" />
            </button>
          )}
        </div>

        <button type="button" className="full-shelf__filter-btn" disabled aria-label="Filtros">
          <Filter aria-hidden="true" />
        </button>
      </div>

      {isSearching && (
        <div className="full-shelf__results-header">
          <p className="full-shelf__results-count">
            {t("myLibrary.resultsCount", { count: displayBooks.length })}
            {" "}&ldquo;{searchQuery}&rdquo;
          </p>
          <button type="button" className="full-shelf__hide-search" onClick={clearSearch}>
            {t("myLibrary.clearSearch")}
          </button>
        </div>
      )}

      {loading && !isSearching ? (
        <div className="full-shelf__grid">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="full-shelf__book-skeleton">
              <div className="full-shelf__skeleton-cover" />
              <div className="full-shelf__skeleton-title" />
              <div className="full-shelf__skeleton-author" />
            </div>
          ))}
        </div>
      ) : (
        <div className="full-shelf__grid">
          {displayBooks.map(book => (
            <BookTile key={book.key} book={book} />
          ))}
          {displayBooks.length === 0 && (
            <div className="full-shelf__no-results">
              <h3 className="full-shelf__no-results-title">{t("myLibrary.noResults")}</h3>
              <img src="/no-results.png" alt="" className="full-shelf__no-results-img" />
            </div>
          )}
        </div>
      )}

    </main>
  );
}
