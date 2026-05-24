import { useState } from "react";
import { saveFavorites } from "@/services/firebase/firebaseUsers";
import type { FavoriteBook } from "@/types/UserProfile";
import type { Book } from "@/types/Book";
import { X } from "lucide-react";
import "./FavoriteBooksEditorModal.scss";
import { useTranslation } from "react-i18next";
import { MAX_FAVORITES } from "@/utils/bookListUtils";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useLockScroll } from "@/hooks/useLockScroll";
import BookSearchPicker from "@/components/book/search-picker/BookSearchPicker";

type FavoriteBooksEditorModalProps = {
  userId: string;
  currentFavorites: FavoriteBook[];
  onClose: () => void;
  onSave: (updated: FavoriteBook[]) => void;
};

export default function FavoriteBooksEditorModal({
  userId,
  currentFavorites,
  onClose,
  onSave,
}: FavoriteBooksEditorModalProps) {
  const [favorites, setFavorites] = useState<FavoriteBook[]>(currentFavorites);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEscapeKey(onClose);
  useLockScroll();

  const addFavorite = (book: Book) => {
    setFavorites((prev) => [
      ...prev,
      { key: book.key, title: book.title, authors: book.authors, cover_url: book.cover_url },
    ]);
  };

  const removeFavorite = (key: string) => {
    setFavorites((prev) => prev.filter((f) => f.key !== key));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveFavorites(userId, favorites);
      onSave(favorites);
      onClose();
    } catch {
      setSaveError(t("profile.favorites.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fav-editor-modal" role="dialog" aria-modal="true">
      <div className="fav-editor-modal__backdrop" onClick={onClose} />
      <div className="fav-editor-modal__box">
        <div className="fav-editor-modal__header">
          <h2 className="fav-editor-modal__title">{t("profile.favorites.modalTitle")}</h2>
          <button
            type="button"
            className="fav-editor-modal__close"
            onClick={onClose}
            aria-label={t("profile.favorites.closeAria")}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <p className="fav-editor-modal__hint">
          {t("profile.favorites.hint", { selected: favorites.length, max: MAX_FAVORITES })}
        </p>

        <div className="fav-editor-modal__current">
          {favorites.map((book) => (
            <div key={book.key} className="fav-editor-modal__fav-item">
              {book.cover_url && (
                <img
                  className="fav-editor-modal__fav-cover"
                  src={book.cover_url}
                  alt={book.title}
                />
              )}
              <div className="fav-editor-modal__fav-info">
                <span className="fav-editor-modal__fav-title">{book.title}</span>
                {book.authors?.[0] && (
                  <span className="fav-editor-modal__fav-author">{book.authors[0]}</span>
                )}
              </div>
              <button
                type="button"
                className="fav-editor-modal__fav-remove"
                onClick={() => removeFavorite(book.key)}
                aria-label={t("profile.favorites.removeAria", { title: book.title })}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        {favorites.length < MAX_FAVORITES && (
          <>
            <BookSearchPicker
              selected={favorites}
              max={MAX_FAVORITES}
              onAdd={addFavorite}
              translationPrefix="profile.favorites"
              classNames={{
                search: "fav-editor-modal__search",
                searching: "fav-editor-modal__searching",
                noResults: "fav-editor-modal__no-results",
                results: "fav-editor-modal__results",
                resultItem: "fav-editor-modal__result-item",
                resultCover: "fav-editor-modal__result-cover",
                resultTitle: "fav-editor-modal__result-title",
                resultAuthor: "fav-editor-modal__result-author",
              }}
            />
          </>
        )}

        <div className="fav-editor-modal__footer">
          {saveError && (
            <p className="fav-editor-modal__save-error" role="alert">{saveError}</p>
          )}
          <div className="fav-editor-modal__footer-actions">
            <button
              type="button"
              className="fav-editor-modal__btn fav-editor-modal__btn--cancel"
              onClick={onClose}
            >
              {t("profile.favorites.cancel")}
            </button>
            <button
              type="button"
              className="fav-editor-modal__btn fav-editor-modal__btn--save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? t("profile.favorites.saving") : t("profile.favorites.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
