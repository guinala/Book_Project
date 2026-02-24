import { useState, useRef, MouseEvent } from "react";
import { useFantasyBooks } from "../hooks/useFantasyBooks";
import type { Book } from "../hooks/useFantasyBooks";
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

function BookCard({ book, getCoverUrl }: { book: Book; getCoverUrl: (id: number) => string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState("");

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    
    //Posicion raton
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calcular la rotación 
    const rotateX = ((y - centerY) / centerY) * -15; // Max 15 grados 
    const rotateY = ((x - centerX) / centerX) * 15;

    setTransformStyle(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`);
  };

  const handleMouseLeave = () => {
    // Restaurar a pos original
    setTransformStyle(`perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`);
  };

  return (
    <div
      ref={cardRef}
      className="booklist__card"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: transformStyle }}
    >
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
        <p className="booklist__author">
          {book.authors.length > 0 ? book.authors.join(", ") : "Autor desconocido"}
        </p>
        {book.first_publish_year > 0 && (
          <p className="booklist__year">{book.first_publish_year}</p>
        )}
      </div>
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
        <h2 className="booklist__title">Fantasía</h2>
        <SkeletonGrid />
      </section>
    );
  }

  if (error) {
    return (
      <section className="booklist">
        <h2 className="booklist__title">Fantasía</h2>
        <p className="booklist__status booklist__status--error">⚠️ {error}</p>
      </section>
    );
  }

  return (
    <section className="booklist">
      <h2 className="booklist__title">Fantasía en Español</h2>
      <div className="booklist__grid">
        {books.map((book) => (
          <BookCard key={book.key} book={book} getCoverUrl={getCoverUrl} />
        ))}
      </div>
    </section>
  );
}