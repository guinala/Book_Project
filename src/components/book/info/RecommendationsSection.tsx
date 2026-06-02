import { useTranslation } from "react-i18next";
import type { Book } from "@/types/Book";
import BookCard from "@/components/book/cards/BookCard";
import "./RecommendationsSection.scss";

type RecommendationsSectionProps = {
  books: Book[];
  onRefresh?: () => void;
};

export default function RecommendationsSection({
  books,
  onRefresh,
}: RecommendationsSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="recs-section">
      <h2 className="recs-section__title">
        {t("bookDetail.recsTitle")}
      </h2>
      <div className="recs-section__grid">
        {books.map((book) => (
          <BookCard key={book.key} book={book} />
        ))}
      </div>
      <div className="recs-section__cta">
        <button className="recs-section__cta-btn" onClick={onRefresh}>
          {t("bookDetail.recsCta", { defaultValue: "Generar más" })}
        </button>
      </div>
    </section>
  );
}
