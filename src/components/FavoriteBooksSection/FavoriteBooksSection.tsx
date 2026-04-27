// src/components/FavoriteBooksSection/FavoriteBooksSection.tsx
import "./FavoriteBooksSection.scss";
import type { FavoriteBook } from "@/types/UserProfile";

type FavoriteBooksSectionProps = {
  favorites: FavoriteBook[];
  isOwnProfile: boolean;
  onEditClick: () => void;
};

export default function FavoriteBooksSection({
  favorites,
  isOwnProfile,
  onEditClick,
}: FavoriteBooksSectionProps) {
  return (
    <div className="favorite-books">
      <div className="favorite-books__header">
        <h2 className="favorite-books__title">Libros favoritos</h2>
        {isOwnProfile && (
          <button
            type="button"
            className="favorite-books__edit-btn"
            onClick={onEditClick}
            aria-label="Editar libros favoritos"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editar
          </button>
        )}
      </div>

      <div className="favorite-books__card">
        {favorites.length === 0 && isOwnProfile && (
          <p className="favorite-books__empty">
            Añade hasta 5 libros favoritos pulsando "Editar"
          </p>
        )}
        {favorites.length === 0 && !isOwnProfile && (
          <p className="favorite-books__empty">Sin libros favoritos aún</p>
        )}
        {favorites.map((book, idx) => (
          <div key={book.key} className="favorite-books__item">
            <span className="favorite-books__number">{idx + 1}</span>
            <div className="favorite-books__cover-wrap">
              {book.cover_url ? (
                <img
                  className="favorite-books__cover"
                  src={book.cover_url}
                  alt={book.title}
                />
              ) : (
                <div className="favorite-books__cover favorite-books__cover--placeholder">
                  <span>{book.title.charAt(0)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
