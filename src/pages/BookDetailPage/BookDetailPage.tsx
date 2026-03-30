import { useParams, useNavigate } from "react-router";
import { useBookDetail } from "@/hooks/useBookDetail";
import BookInfoCard from "@/components/BookInfoCard/BookInfoCard";
import ReviewsSection from "@/components/ReviewsSection/ReviewsSection";
import AuthorSection from "@/components/AuthorSection/AuthorSection";
import RecommendationsSection from "@/components/RecommendationsSection/RecommendationsSection";
import "./BookDetailPage.scss";

export default function BookDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { book, loading, error } = useBookDetail(id);

  if (loading) {
    return (
      <main className="book-detail-page">
        <p className="book-detail-page__status">Cargando...</p>
      </main>
    );
  }

  if (error || !book) {
    return (
      <main className="book-detail-page">
        <p className="book-detail-page__status book-detail-page__status--error">
          {error ?? "No se ha encontrado el libro"}
        </p>
        <button className="book-detail-page__back-btn" onClick={() => navigate(-1)}>
          Volver
        </button>
      </main>
    );
  }

  return (
    <main className="book-detail-page">
      <section className="book-detail-page__info-section">
        <BookInfoCard book={book} />
      </section>

      <ReviewsSection reviews={book.reviews} />

      <AuthorSection authorInfo={book.authorInfo} />

      <RecommendationsSection books={book.recommendations} baseTitle={book.title} />
    </main>
  );
}
