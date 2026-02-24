import { useFantasyBooks } from "../hooks/useFantasyBooks";
import "./BookList.css";

const SKELETON_COUNT = 10;

function SkeletonGrid() {
  return (
    <div className="booklist__skeleton-grid">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <div key={i} className="booklist__skeleton-card">
          <div className="booklist__skeleton-cover" />
          <div className="booklist__skeleton-line" />
          <div className="booklist__skeleton-line booklist__skeleton-line--short" />
        </div>
      ))}
    </div>
  );
}

export default function BookList() {
  const { books, loading, error } = useFantasyBooks(100);

  const getCoverUrl = (coverId: number) =>
    `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;

  if (loading) {
    return (
      <section className="booklist">
        <h2 className="booklist__title">Fantasía en Español</h2>
        <SkeletonGrid />
      </section>
    );
  }

  if (error) {
    return (
      <section className="booklist">
        <h2 className="booklist__title">Fantasía en Español</h2>
        <p className="booklist__status booklist__status--error">⚠️ {error}</p>
      </section>
    );
  }

  return (
    <section className="booklist">
      <h2 className="booklist__title">Fantasía en Español</h2>
      <div className="booklist__grid">
        {books.map((book) => (
          <div key={book.key} className="booklist__card">
            {book.cover_id ? (
              <img
                className="booklist__cover"
                src={getCoverUrl(book.cover_id)}
                alt={book.title}
                loading="lazy"
              />
            ) : (
              <div className="booklist__cover-placeholder">📖</div>
            )}
            <div className="booklist__info">
              <h3 className="booklist__book-title">{book.title}</h3>

              {/* authors ahora es string[], join directo sin .name */}
              <p className="booklist__author">
                {book.authors.length > 0
                  ? book.authors.join(", ")
                  : "Autor desconocido"}
              </p>

              {book.first_publish_year > 0 && (
                <p className="booklist__year">{book.first_publish_year}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}