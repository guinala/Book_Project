import { useState, useRef, useEffect, useCallback } from "react";
import type { BookDetail, ShelfStatus } from "@/types/BookDetail";
import StarRating from "@/components/StarRating/StarRating";
import SynopsisModal from "@/components/SynopsisModal/SynopsisModal";
import "./BookInfoCard.scss";

const SHELF_OPTIONS: ShelfStatus[] = ["Quiero leer", "Leyendo", "Acabado", "No acabado"];

function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return (Number.isInteger(k) ? k : k.toFixed(1)) + "K";
  }
  return n.toString();
}

type BookInfoCardProps = {
  book: BookDetail;
};

export default function BookInfoCard({ book }: BookInfoCardProps) {
  const [shelfOpen, setShelfOpen] = useState(false);
  const [savedShelf, setSavedShelf] = useState<ShelfStatus | null>(null);
  const [synopsisOpen, setSynopsisOpen] = useState(false);
  const shelfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shelfOpen) return;
    const handler = (e: MouseEvent) => {
      if (shelfRef.current && !shelfRef.current.contains(e.target as Node)) {
        setShelfOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [shelfOpen]);

  const handleShelfSelect = useCallback(
    (opt: ShelfStatus) => {
      if (savedShelf === opt) {
        setSavedShelf(null);
      } else {
        setSavedShelf(opt);
        setShelfOpen(false);
      }
    },
    [savedShelf]
  );

  return (
    <>
      {synopsisOpen && (
        <SynopsisModal text={book.synopsis} onClose={() => setSynopsisOpen(false)} />
      )}

      <div className="book-info-card">
        <div className="book-info-card__cover-wrap">
          <img
            className="book-info-card__cover"
            src={book.cover_url}
            alt={`Portada de ${book.title}`}
          />
          <div className="book-info-card__cover-overlay">
            <span className="book-info-card__cover-overlay-text">Ver libro</span>
          </div>
        </div>

        <button className="book-info-card__share-btn" aria-label="Compartir">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>

        <div className="book-info-card__details">
          <span className="book-info-card__genre">{book.genre}</span>
          <h1 className="book-info-card__title">{book.title}</h1>
          <p className="book-info-card__author">{book.author}</p>

          <div className="book-info-card__info-row">
            <div className="book-info-card__rating-block">
              <span className="book-info-card__rating-number">{book.rating}</span>
              <div className="book-info-card__rating-group">
                <StarRating rating={book.rating} size={15} />
                <span className="book-info-card__rating-count">
                  {formatCount(book.reviewCount)} valoraciones
                </span>
              </div>
            </div>

            <div className="book-info-card__divider" />
            <div className="book-info-card__meta-item">
              <span className="book-info-card__meta-label">Páginas</span>
              <span className="book-info-card__meta-value">{book.pages}</span>
            </div>

            <div className="book-info-card__divider" />
            <div className="book-info-card__meta-item">
              <span className="book-info-card__meta-label">Publicación</span>
              <span className="book-info-card__meta-value">{book.year}</span>
            </div>

            <div className="book-info-card__divider" />
            <div className="book-info-card__meta-item">
              <span className="book-info-card__meta-label">ISBN</span>
              <span className="book-info-card__meta-value">{book.isbn}</span>
            </div>
          </div>

          <div className="book-info-card__synopsis">
            <div className="book-info-card__synopsis-text">
              {book.synopsis.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="book-info-card__synopsis-gradient">
              <button
                className="book-info-card__synopsis-expand"
                onClick={() => setSynopsisOpen(true)}
              >
                Leer más
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          </div>

          <div className="book-info-card__footer">
            <div ref={shelfRef} className="book-info-card__save-wrapper">
              <button
                className={[
                  "book-info-card__save-btn",
                  savedShelf && !shelfOpen ? "book-info-card__save-btn--saved" : "",
                  shelfOpen ? "book-info-card__save-btn--open" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setShelfOpen((o) => !o)}
              >
                {savedShelf && !shelfOpen && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="book-info-card__save-check"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {savedShelf || "Guardar libro"}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="book-info-card__save-chevron"
                >
                  <polyline points="9 6 15 12 9 18" />
                </svg>
              </button>

              {shelfOpen && (
                <ul className="book-info-card__dropdown">
                  {SHELF_OPTIONS.map((opt) => (
                    <li key={opt}>
                      <button
                        className={[
                          "book-info-card__dropdown-item",
                          savedShelf === opt ? "book-info-card__dropdown-item--active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => handleShelfSelect(opt)}
                      >
                        {savedShelf === opt && (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {opt}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
