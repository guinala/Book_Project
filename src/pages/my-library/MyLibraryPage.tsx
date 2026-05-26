import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import CurrentReadingCard from "@/components/shelf/sections/CurrentReadingCard";
import ShelfSection from "@/components/shelf/sections/ShelfSection";
import ListsSection from "@/components/shelf/sections/ListsSection";
import ProgressSection from "@/components/shelf/sections/ProgressSection";
import { useShelf } from "@/context/shelf/useShelf";
import "./MyLibraryPage.scss";
import { useLists } from "@/hooks/useLists";
import { useState } from "react";
import { useAuth } from "@/context/auth/useAuth";
import ListEditorModal from "@/components/shelf/modals/ListEditorModal";
import RegisterForm from "@/components/auth/forms/RegisterForm";

function MyLibraryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shelfByStatus } = useShelf();
  const { user, isAuthenticated, loading } = useAuth();
  const { lists, createList } = useLists(user?.uid);
  const [editorOpen, setEditorOpen] = useState(false);

  if (loading) {
    return <section className="my-library"><p>{t("auth.loading")}</p></section>;
  }

  if (!isAuthenticated) {
    return (
      <section className="my-library my-library--guest">
        <div className="my-library__guest-form">
          <h2 className="my-library__guest-title">Crea una cuenta para empezar a añadir tus libros</h2>
          <RegisterForm />
        </div>
      </section>
    );
  }

  return (
    <section className="my-library">
      <div className="my-library__reading-section">
        <CurrentReadingCard />
      </div>

      <div className="my-library__shelf-section">
        <ShelfSection books={shelfByStatus} onSeeAll={() => navigate("/my-library/shelf")} />
      </div>

      <div className="my-library__lists-section">
        <ListsSection
          lists={lists}
          userId={user?.uid ?? ""}
          isOwner={true}
          onCreateList={() => setEditorOpen(true)}
        />
      </div>

      <div className="my-library__progresses-section">
        <ProgressSection />
      </div>

      {editorOpen && (
        <ListEditorModal
          onClose={() => setEditorOpen(false)}
          onSubmit={async ({ name, books }) => { await createList(name, books); }}
        />
      )}
    </section>
  );
}

export default MyLibraryPage;
