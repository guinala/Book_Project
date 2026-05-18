// src/components/FavoriteBooksSection/FavoriteBooksSection.tsx
import { useNavigate } from "react-router";
import "./FavoriteBooksSection.scss";
import type { FavoriteBook } from "@/types/UserProfile";
import { encodeKey } from "@/utils/bookPaths";
import { useTranslation } from "react-i18next";

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
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="favorite-books">
      <div className="favorite-books__header">
        <h2 className="favorite-books__title">{t("profile.favorites.sectionTitle")}</h2>
        {isOwnProfile && (
          <button
            type="button"
            className="favorite-books__edit-btn"
            onClick={onEditClick}
            aria-label={t("profile.favorites.modalTitle")}
          >
            {t("profile.favorites.edit")}
          </button>
        )}
      </div>

      <div className="favorite-books__card">
        {favorites.length === 0 && isOwnProfile && (
          <p className="favorite-books__empty">
            {t("profile.favorites.emptyOwn")}
          </p>
        )}
        {favorites.length === 0 && !isOwnProfile && (
          <p className="favorite-books__empty">{t("profile.favorites.emptyOther")}</p>
        )}
        {favorites.map((book, idx) => (
          <div key={book.key} className="favorite-books__item">
            <span className="favorite-books__number">{idx + 1}</span>
            <button
              type="button"
              className="favorite-books__cover-wrap"
              onClick={() => navigate(`/books/${encodeKey(book.key)}`, { state: { book } })}
              aria-label={book.title}
            >
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
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
