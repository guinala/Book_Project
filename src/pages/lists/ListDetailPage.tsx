import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/context/auth/useAuth";
import { useLists } from "@/hooks/useLists";
import BookCard from "@/components/book/cards/BookCard";
import ListEditorModal from "@/components/shelf/modals/ListEditorModal";
import { listBookToBook } from "@/utils/bookListUtils";
import "./ListDetailPage.scss";

export default function ListDetailPage() {
  const { userId, listId } = useParams<{ userId: string; listId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lists, loading, updateList, deleteList } = useLists(userId);
  const [editorOpen, setEditorOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isOwner = !!user && user.uid === userId;
  const list = lists.find((l) => l.id === listId);

  const handleDelete = async () => {
    if (!listId) return;
    await deleteList(listId);
    navigate(`/lists/${userId}`);
  };

  return (
    <div className="list-detail-page">
      <div className="list-detail-page__header">
        <button
          type="button"
          className="list-detail-page__back"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft aria-hidden="true" />
          {t("explore.backBtn")}
        </button>
        {list && (
          <div className="list-detail-page__title-block">
            <h2 className="list-detail-page__title">{list.name}</h2>
            {list.description && (
              <p className="list-detail-page__description">{list.description}</p>
            )}
          </div>
        )}
        {list && isOwner && (
          <div className="list-detail-page__actions">
            <button
              type="button"
              className="list-detail-page__action"
              onClick={() => setEditorOpen(true)}
            >
              <Pencil size={16} aria-hidden="true" /> {t("myLibrary.listDetail.edit")}
            </button>
            <button
              type="button"
              className="list-detail-page__action list-detail-page__action--danger"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 size={16} aria-hidden="true" /> {t("myLibrary.listDetail.delete")}
            </button>
          </div>
        )}
      </div>

      {!loading && !list && (
        <p className="list-detail-page__empty">{t("myLibrary.listDetail.notFound")}</p>
      )}

      {list && list.books.length === 0 && (
        <p className="list-detail-page__empty">{t("myLibrary.listDetail.empty")}</p>
      )}

      {list && list.books.length > 0 && (
        <div className="list-detail-page__grid">
          {list.books.map((book) => (
            <BookCard key={book.key} book={listBookToBook(book)} />
          ))}
        </div>
      )}

      {editorOpen && isOwner && list && (
        <ListEditorModal
          existingList={list}
          onClose={() => setEditorOpen(false)}
          onSubmit={async ({ name, description, books }) => {
            await updateList(list.id, { name, description, books });
          }}
        />
      )}

      {confirmOpen && isOwner && (
        <div className="list-detail-page__confirm" role="dialog" aria-modal="true">
          <div
            className="list-detail-page__confirm-backdrop"
            onClick={() => setConfirmOpen(false)}
          />
          <div className="list-detail-page__confirm-box">
            <p className="list-detail-page__confirm-text">
              {t("myLibrary.listDetail.confirmDelete")}
            </p>
            <p className="list-detail-page__confirm-subtitle">
              {t("myLibrary.listDetail.confirmDeleteSubtitle")}
            </p>
            <div className="list-detail-page__confirm-actions">
              <button
                type="button"
                className="list-detail-page__confirm-btn list-detail-page__confirm-btn--danger"
                onClick={handleDelete}
              >
                {t("myLibrary.listDetail.confirmDeleteYes")}
              </button>
              <button
                type="button"
                className="list-detail-page__confirm-btn"
                onClick={() => setConfirmOpen(false)}
              >
                {t("myLibrary.listDetail.confirmDeleteNo")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
