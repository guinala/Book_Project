import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Plus, X } from "lucide-react";
import type { Book } from "@/types/Book";
import type { BookList, ListBook } from "@/types/BookList";
import { createListDB, getLists, updateListDB } from "@/services/firebase/firebaseLists";
import { encodeKey } from "@/utils/bookPaths";
import Modal from "@/components/common/Modal";
import "./AddToListModal.scss";

type AddToListModalProps = {
  book: Book;
  userId: string;
  onClose: () => void;
};

export default function AddToListModal({ book, userId, onClose }: AddToListModalProps) {
  const { t } = useTranslation();
  const encodedBookKey = encodeKey(book.key);

  const [lists, setLists] = useState<BookList[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [createMode, setCreateMode] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getLists(userId)
      .then(setLists)
      .catch(() => setLists([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleToggle = async (list: BookList) => {
    if (!lists) return;
    const alreadyIn = list.books.some((b) => b.key === encodedBookKey);
    const listBook: ListBook = {
      key: encodedBookKey,
      title: book.title,
      authors: book.authors,
      cover_url: book.cover_url ?? undefined,
    };
    const newBooks = alreadyIn
      ? list.books.filter((b) => b.key !== encodedBookKey)
      : [...list.books, listBook];
    setLists((prev) => prev?.map((l) => (l.id === list.id ? { ...l, books: newBooks } : l)) ?? null);
    try {
      await updateListDB(userId, list.id, { books: newBooks });
    } catch {
      setLists((prev) => prev?.map((l) => (l.id === list.id ? list : l)) ?? null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newListName.trim();
    if (!trimmed) return;
    setCreating(true);
    const listBook: ListBook = {
      key: encodedBookKey,
      title: book.title,
      authors: book.authors,
      cover_url: book.cover_url ?? undefined,
    };
    try {
      const id = await createListDB(userId, trimmed, [listBook]);
      const date = new Date().toISOString();
      const newList: BookList = {
        id, name: trimmed, books: [listBook], description: "", createdAt: date, updatedAt: date,
      };
      setLists((prev) => [...(prev ?? []), newList]);
      setNewListName("");
      setCreateMode(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      title={t("book.addToList")}
      closeAriaLabel={t("myLibrary.listEditor.closeAria")}
      onClose={onClose}
      usePortal
      classNames={{
        root: "add-to-list-modal",
        backdrop: "add-to-list-modal__backdrop",
        box: "add-to-list-modal__box",
        header: "add-to-list-modal__header",
        title: "add-to-list-modal__title",
        close: "add-to-list-modal__close",
      }}
    >
      <div className="add-to-list-modal__body">
        {loading ? (
          <p className="add-to-list-modal__empty">{t("bookDetail.loading")}</p>
        ) : lists && lists.length > 0 ? (
          <ul className="add-to-list-modal__list">
            {lists.map((list) => {
              const inList = list.books.some((b) => b.key === encodedBookKey);
              return (
                <li key={list.id}>
                  <button
                    type="button"
                    className={`add-to-list-modal__item${inList ? " add-to-list-modal__item--active" : ""}`}
                    onClick={() => handleToggle(list)}
                  >
                    <span className="add-to-list-modal__item-name">{list.name}</span>
                    <span className="add-to-list-modal__item-icon">
                      {inList ? <Check size={14} /> : <Plus size={14} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="add-to-list-modal__empty">{t("book.noLists")}</p>
        )}
      </div>

      <div className="add-to-list-modal__footer">
        <hr className="add-to-list-modal__divider" />
        {!createMode ? (
          <button
            type="button"
            className="add-to-list-modal__create-btn"
            onClick={() => setCreateMode(true)}
          >
            <Plus size={14} />
            {t("myLibrary.createList")}
          </button>
        ) : (
          <form className="add-to-list-modal__create-form" onSubmit={handleCreate}>
            <input
              autoFocus
              className="add-to-list-modal__create-input"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder={t("myLibrary.listEditor.namePlaceholder")}
              aria-label={t("myLibrary.listEditor.nameLabel")}
              disabled={creating}
            />
            <div className="add-to-list-modal__create-actions">
              <button
                type="submit"
                className="add-to-list-modal__action-btn"
                disabled={!newListName.trim() || creating}
                aria-label={t("myLibrary.listEditor.save")}
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                className="add-to-list-modal__action-btn"
                aria-label={t("myLibrary.listEditor.cancel")}
                onClick={() => { setCreateMode(false); setNewListName(""); }}
              >
                <X size={14} />
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
