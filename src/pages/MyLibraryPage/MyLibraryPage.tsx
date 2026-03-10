import { useTranslation } from "react-i18next";
import CurrentReadingCard from "../../components/CurrentReadingCard/CurrentReadingCard";
import "./MyLibraryPage.scss";

function MyLibraryPage() {
  const { t } = useTranslation();

  return (
    <section className="my-library">
      <h2 className="my-library__heading">{t("myLibrary.heading")}</h2>

      <div className="my-library__reading-section">
        <CurrentReadingCard />
      </div>
    </section>
  );
}

export default MyLibraryPage;