import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useBookDetail } from "@/hooks/useBookDetail";
import BookInfoCard from "@/components/book/info/BookInfoCard";
import ReviewsSection from "@/components/book/info/ReviewsSection";
import AuthorSection from "@/components/book/info/AuthorSection";
import RecommendationsSection from "@/components/book/info/RecommendationsSection";
import "./BookDetailPage.scss";
import { useAuthorData } from "@/hooks/useAuthorData";
import { useBookRecommendations } from "@/hooks/useBookRecommendations";
import { useEffect } from "react";
import { toWorkKey } from "@/utils/bookPaths";

export default function BookDetailPage() {
  const { bookId = "" } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { book, loading, error } = useBookDetail(bookId);
  const { authorInfo, loading: authorLoading } = useAuthorData(
    book?.author ?? '',
    book?.title ?? '',
    book?.authorKey 
  );
  const { books: recommendedBooks, refresh: refreshRecs } = useBookRecommendations(
    book?.genre ?? '',
    book?.key ?? toWorkKey(bookId)
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [bookId]);

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
          <h2 className="book-detail-page__under-construction-title">
            Esta página está en obras, lo sentimos
          </h2>
          <p className="book-detail-page__under-construction-sub">
            Estamos trabajando para traerte la información de este libro pronto.
          </p>
          <button className="book-detail-page__back-btn" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
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
