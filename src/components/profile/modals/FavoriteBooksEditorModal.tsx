// src/components/FavoriteBooksEditorModal/FavoriteBooksEditorModal.tsx
import { useEffect, useRef, useState } from "react";
import { searchBooks } from "@/services/api/openLibraryApi";
import { updateUserProfile } from "@/services/firebase/firebaseUsers";
import type { FavoriteBook } from "@/types/UserProfile";
import type { Book } from "@/types/Book";
import "./FavoriteBooksEditorModal.scss";

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
  const abortRef = useRef<AbortController | null>(null);

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

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setSearching(true);
      try {
        const { books } = await searchBooks(
          { q: query },
          8,
          "es",
          abortRef.current.signal
        );
        setResults(books);
      } catch {
        // aborted or error — ignore
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

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
      await updateUserProfile(userId, { favoriteBooks: favorites });
      onSave(favorites);
      onClose();
    } catch {
      setSaveError("No se pudo guardar. Comprueba tu conexion e intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fav-editor-modal" role="dialog" aria-modal="true">
      <div className="fav-editor-modal__backdrop" onClick={onClose} />
      <div className="fav-editor-modal__box">
        <div className="fav-editor-modal__header">
          <h2 className="fav-editor-modal__title">Editar libros favoritos</h2>
          <button
            type="button"
            className="fav-editor-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="fav-editor-modal__hint">
          {favorites.length}/{MAX_FAVORITES} libros seleccionados
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
                aria-label={`Eliminar ${book.title}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {favorites.length < MAX_FAVORITES && (
          <>
            <input
              className="fav-editor-modal__search"
              type="text"
              placeholder="Buscar libro..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {searching && (
              <p className="fav-editor-modal__searching">Buscando...</p>
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
              Cancelar
            </button>
            <button
              type="button"
              className="fav-editor-modal__btn fav-editor-modal__btn--save"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
