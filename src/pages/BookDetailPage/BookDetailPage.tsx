import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useBookDetail } from "@/hooks/useBookDetail";
import BookInfoCard from "@/components/BookInfoCard/BookInfoCard";
import ReviewsSection from "@/components/ReviewsSection/ReviewsSection";
import AuthorSection from "@/components/AuthorSection/AuthorSection";
import RecommendationsSection from "@/components/RecommendationsSection/RecommendationsSection";
import "./BookDetailPage.scss";
import { useAuthorData } from "@/hooks/useAuthorData";
import { useEffect } from "react";

export default function BookDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { book, loading, error } = useBookDetail(id);
  const { authorInfo, loading: authorLoading } = useAuthorData(
    book?.author ?? '',
    book?.title ?? '',
    book?.authorKey 
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  if (loading) {
    return (
      <main className="book-detail-page">
        <p className="book-detail-page__status">{t("bookDetail.loading")}</p>
      </main>
    );
  }

  if (error || !book) {
    return (
      <main className="book-detail-page">
        <p className="book-detail-page__status book-detail-page__status--error">
          {error ?? t("bookDetail.notFound")}
        </p>
        <button className="book-detail-page__back-btn" onClick={() => navigate(-1)}>
          {t("bookDetail.back")}
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

      {authorLoading
        ? <p className="book-detail-page__status">{t("bookDetail.loading")}</p>
        : <AuthorSection authorInfo={authorInfo ?? book.authorInfo} />
      }

      <RecommendationsSection books={book.recommendations} baseTitle={book.title} />
    </main>
  );
}
