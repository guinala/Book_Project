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
  return (
    <section className="recs-section">
      <h2 className="recs-section__title">
        Recomendaciones basadas en{" "}
        <span className="recs-section__title-highlight">{baseTitle}</span>
      </h2>
      <div className="recs-section__grid">
        {books.map((book) => (
          <BookCard key={book.key} book={book} />
        ))}
      </div>
    </section>
  );
}
