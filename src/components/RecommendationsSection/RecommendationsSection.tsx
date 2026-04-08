import { useTranslation } from "react-i18next";
import type { Book } from "@/types/Book";
import BookCard from "@/components/BookCard/BookCard";
import "./RecommendationsSection.scss";

type RecommendationsSectionProps = {
  books: Book[];
  baseTitle: string;
};

export default function RecommendationsSection({
  books,
  baseTitle,
}: RecommendationsSectionProps) {
  const { t } = useTranslation();
  return (
    <section className="recs-section">
      <h2 className="recs-section__title">
        {t("bookDetail.recsTitle", { title: baseTitle })}
      </h2>
      <div className="recs-section__grid">
        {books.map((book) => (
          <BookCard key={book.key} book={book} />
        ))}
      </div>
    </section>
  );
}
