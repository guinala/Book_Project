import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useBookDetail } from "@/hooks/useBookDetail";
import BookInfoCard from "@/components/BookInfoCard/BookInfoCard";
import ReviewsSection from "@/components/ReviewsSection/ReviewsSection";
import AuthorSection from "@/components/AuthorSection/AuthorSection";
import RecommendationsSection from "@/components/RecommendationsSection/RecommendationsSection";
import "./BookDetailPage.scss";
import { useAuthorData } from "@/hooks/useAuthorData";
import { useBookRecommendations } from "@/hooks/useBookRecommendations";
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
  const { books: recommendedBooks, refresh: refreshRecs } = useBookRecommendations(
    book?.genre ?? '',
    book?.key ?? decodeURIComponent(id)
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  if (loading) {
    return (
      <div className="book-detail-page">
        <p className="book-detail-page__status">{t("bookDetail.loading")}</p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="book-detail-page">
        <div className="book-detail-page__under-construction">
          <span className="book-detail-page__under-construction-icon" aria-hidden="true">🚧</span>
          <h2 className="book-detail-page__under-construction-title">
            Esta página está en obras, lo sentimos
          </h2>
          <p className="book-detail-page__under-construction-sub">
            Estamos trabajando para traerte la información de este libro pronto.
          </p>
          <button className="book-detail-page__back-btn" onClick={() => navigate(-1)}>
            {t("bookDetail.back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="book-detail-page">
      <section className="book-detail-page__info-section">
        <BookInfoCard book={book} />
      </section>

      <ReviewsSection reviews={book.reviews} />

      {authorLoading
        ? <p className="book-detail-page__status">{t("bookDetail.loading")}</p>
        : <AuthorSection authorInfo={authorInfo ?? book.authorInfo} />
      }

      {recommendedBooks.length > 0 && (
        <RecommendationsSection books={recommendedBooks} baseTitle={book.title} onRefresh={refreshRecs} />
      )}
    </div>
  );
}
