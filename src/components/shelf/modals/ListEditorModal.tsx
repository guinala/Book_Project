import type { Book } from "@/types/Book";
import type { BookList, ListBook } from "@/types/BookList";
import { isValidListName, MAX_LIST_BOOKS } from "@/utils/bookListUtils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./ListEditorModal.scss";
import { useCurrentLanguage } from "@/plugins/i18n/useCurrentLanguage";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useLockScroll } from "@/hooks/useLockScroll";
import { useDebouncedBookSearch } from "@/hooks/useDebouncedBookSearch";

const BOOKS_PER_PAGE = 4;

type ListEditorModalProps = {
    existingList?: BookList,
    onSubmit: (data: { name: string; books: ListBook[] }) => Promise<void>;
    onClose: () => void;
}

export default function ListEditorModal({
    existingList, onSubmit, onClose,
}: ListEditorModalProps) {
    const { t } = useTranslation();
    const { lang } = useCurrentLanguage();
    const isEdit = !!existingList;

    const [name, setName] = useState(existingList?.name ?? "");
    const [books, setBooks] = useState<ListBook[]>(existingList?.books ?? []);
    const [page, setPage] = useState(0);
    const [query, setQuery] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const { results, searching } = useDebouncedBookSearch(query, { lang });

    const totalPages = Math.max(1, Math.ceil(books.length / BOOKS_PER_PAGE));
    const safePage = Math.min(page, totalPages - 1);
    const pageBooks = books.slice(
        safePage * BOOKS_PER_PAGE,
        safePage * BOOKS_PER_PAGE + BOOKS_PER_PAGE,
    );

    useEscapeKey(onClose);
    useLockScroll();

    const addBook = (book: Book) => {
    if (books.length >= MAX_LIST_BOOKS) return;
    if (books.some((b) => b.key === book.key)) return;
    setBooks((prev) => [
      ...prev,
      { key: book.key, title: book.title, authors: book.authors, cover_url: book.cover_url },
    ]);
    setQuery("");
  };

  const removeBook = (key: string) => {
    setBooks((prev) => prev.filter((b) => b.key !== key));
  };

  const handleSubmit = async () => {
    if (!isValidListName(name) || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSubmit({ name: name.trim(), books });
      onClose();
    } catch {
      setSaveError(t("myLibrary.listEditor.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="list-editor-modal" role="dialog" aria-modal="true">
      <div className="list-editor-modal__backdrop" onClick={onClose} />
      <div className="list-editor-modal__box">
        <div className="list-editor-modal__header">
          <h2 className="list-editor-modal__title">
            {isEdit
              ? t("myLibrary.listEditor.editTitle")
              : t("myLibrary.listEditor.createTitle")}
          </h2>
          <button
            type="button"
            className="list-editor-modal__close"
            onClick={onClose}
            aria-label={t("myLibrary.listEditor.closeAria")}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <input
          className="list-editor-modal__name"
          type="text"
          placeholder={t("myLibrary.listEditor.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <p className="list-editor-modal__counter">
          {t("myLibrary.listEditor.counter", { count: books.length, max: MAX_LIST_BOOKS })}
        </p>

        <div className="list-editor-modal__current">
          {books.length === 0 && (
            <p className="list-editor-modal__empty">{t("myLibrary.listEditor.empty")}</p>
          )}
          {pageBooks.map((book) => (
            <div key={book.key} className="list-editor-modal__book-item">
              {book.cover_url && (
                <img
                  className="list-editor-modal__book-cover"
                  src={book.cover_url}
                  alt={book.title}
                />
              )}
              <div className="list-editor-modal__book-info">
                <span className="list-editor-modal__book-title">{book.title}</span>
                {book.authors?.[0] && (
                  <span className="list-editor-modal__book-author">{book.authors[0]}</span>
                )}
              </div>
              <button
                type="button"
                className="list-editor-modal__book-remove"
                onClick={() => removeBook(book.key)}
                aria-label={t("myLibrary.listEditor.removeAria", { title: book.title })}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="list-editor-modal__pager">
            <button
              type="button"
              className="list-editor-modal__pager-btn"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              aria-label={t("myLibrary.listEditor.prevPage")}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <span className="list-editor-modal__pager-info">
              {safePage + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="list-editor-modal__pager-btn"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage === totalPages - 1}
              aria-label={t("myLibrary.listEditor.nextPage")}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        )}

        {books.length < MAX_LIST_BOOKS && (
          <>
            <input
              className="list-editor-modal__search"
              type="text"
              placeholder={t("myLibrary.listEditor.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {searching && (
              <p className="list-editor-modal__searching">
                {t("myLibrary.listEditor.searching")}
              </p>
            )}
            {!searching && query.trim() && results.length === 0 && (
              <p className="list-editor-modal__no-results">
                {t("myLibrary.listEditor.noResults")}
              </p>
            )}
            {results.length > 0 && (
              <ul className="list-editor-modal__results">
                {results.map((book) => (
                  <li key={book.key}>
                    <button
                      type="button"
                      className="list-editor-modal__result-item"
                      onClick={() => addBook(book)}
                      disabled={books.some((b) => b.key === book.key)}
                    >
                      {book.cover_url && (
                        <img
                          className="list-editor-modal__result-cover"
                          src={book.cover_url}
                          alt=""
                          aria-hidden="true"
                        />
                      )}
                      <div>
                        <p className="list-editor-modal__result-title">{book.title}</p>
                        <p className="list-editor-modal__result-author">{book.authors[0]}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <div className="list-editor-modal__footer">
          {saveError && (
            <p className="list-editor-modal__save-error" role="alert">{saveError}</p>
          )}
          <div className="list-editor-modal__footer-actions">
            <button
              type="button"
              className="list-editor-modal__btn list-editor-modal__btn--cancel"
              onClick={onClose}
            >
              {t("myLibrary.listEditor.cancel")}
            </button>
            <button
              type="button"
              className="list-editor-modal__btn list-editor-modal__btn--save"
              onClick={handleSubmit}
              disabled={saving || !isValidListName(name)}
            >
              {saving ? t("myLibrary.listEditor.saving") : t("myLibrary.listEditor.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
