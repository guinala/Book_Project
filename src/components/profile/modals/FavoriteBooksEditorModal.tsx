// src/components/FavoriteBooksEditorModal/FavoriteBooksEditorModal.tsx
import { useEffect, useState } from "react";
import { saveFavorites } from "@/services/firebase/firebaseUsers";
import type { FavoriteBook } from "@/types/UserProfile";
import type { Book } from "@/types/Book";
import { X } from "lucide-react";
import "./FavoriteBooksEditorModal.scss";
import { useTranslation } from "react-i18next";
import { searchBooksWithFallback } from "@/services/firebase/firebaseBooks";

const MAX_FAVORITES = 5;

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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { t, i18n } = useTranslation();
  const lang = i18n.language.split("-")[0];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(() => {
      setSearching(true);
      searchBooksWithFallback(query, lang, 8)
        .then((books) => {
          if (!cancelled) { setResults(books); setSearching(false); }
        })
        .catch(() => {
          if (!cancelled) { setResults([]); setSearching(false); }
        });
    }, 400);

    return () => { 
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, lang]);

  const addFavorite = (book: Book) => {
    if (favorites.length >= MAX_FAVORITES) return;
    if (favorites.some((f) => f.key === book.key)) return;
    setFavorites((prev) => [
      ...prev,
      {
        key: book.key,
        title: book.title,
        authors: book.authors,
        cover_url: book.cover_url,
      },
    ]);
    setQuery("");
    setResults([]);
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
              <span className="fav-editor-modal__fav-title">{book.title}</span>
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
            <input
              className="fav-editor-modal__search"
              type="text"
              placeholder={t("profile.favorites.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {searching && (
              <p className="fav-editor-modal__searching">{t("profile.favorites.searching")}</p>
            )}
            
            {!searching && query.trim() && results.length === 0 && (
              <p className="fav-editor-modal__no-results">
                {t("profile.favorites.noResults")}
              </p>
            )}

            {results.length > 0 && (
              <ul className="fav-editor-modal__results">
                {results.map((book) => (
                  <li key={book.key}>
                    <button
                      type="button"
                      className="fav-editor-modal__result-item"
                      onClick={() => addFavorite(book)}
                      disabled={favorites.some((f) => f.key === book.key)}
                    >
                      {book.cover_url && (
                        <img
                          className="fav-editor-modal__result-cover"
                          src={book.cover_url}
                          alt=""
                          aria-hidden="true"
                        />
                      )}
                      <div>
                        <p className="fav-editor-modal__result-title">
                          {book.title}
                        </p>
                        <p className="fav-editor-modal__result-author">
                          {book.authors[0]}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
