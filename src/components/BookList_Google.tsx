import { useFantasyBooks_Google } from "../hooks/useFantasyBooks_Google";
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
  const { books, loading, error } = useFantasyBooks_Google(20);

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
            {book.cover_url ? (
              <img
                className="booklist__cover"
                src={book.cover_url}
                alt={book.title}
                loading="lazy"
              />
            ) : (
              <div className="booklist__cover-placeholder">📖</div>
            )}

            <div className="booklist__info">
              <h3 className="booklist__book-title">{book.title}</h3>

              <p className="booklist__author">
                {book.authors.length
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