import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLists } from "@/hooks/useLists";
import ListCard from "@/components/shelf/cards/ListCard";
import ListEditorModal from "@/components/shelf/modals/ListEditorModal";
import "./AllListsPage.scss";

export default function AllListsPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { lists, loading, createList } = useLists(userId);
  const [editorOpen, setEditorOpen] = useState(false);

  const isOwner = !!user && user.uid === userId;

  return (
    <div className="all-lists-page">
      <div className="all-lists-page__header">
        <button
          type="button"
          className="all-lists-page__back"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft aria-hidden="true" />
          {t("explore.backBtn")}
        </button>
        <h2 className="all-lists-page__title">{t("myLibrary.allListsTitle")}</h2>
      </div>

      {!loading && (
        <div className="all-lists-page__grid">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} userId={userId!} />
          ))}
          {isOwner && (
            <button
              type="button"
              className="lists-section__create"
              onClick={() => setEditorOpen(true)}
            >
              <div className="lists-section__create-icon">
                <Plus size={18} aria-hidden="true" />
              </div>
              <span className="lists-section__create-text">
                {t("myLibrary.createList")}
              </span>
            </button>
          )}
        </div>
      )}

      {editorOpen && isOwner && (
        <ListEditorModal
          onClose={() => setEditorOpen(false)}
          onSubmit={async ({ name, books }) => { await createList(name, books); }}
        />
      )}
    </div>
  );
}
