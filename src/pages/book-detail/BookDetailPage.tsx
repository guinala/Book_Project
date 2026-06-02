import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useBookDetail } from "@/pages/book-detail/hooks/useBookDetail";
import BookInfoCard from "@/components/book/info/BookInfoCard";
import ReviewsSection from "@/components/book/info/ReviewsSection";
import AuthorSection from "@/components/book/info/AuthorSection";
import RecommendationsSection from "@/components/book/info/RecommendationsSection";
import BookInfoCardSkeleton from "@/components/book/info/BookInfoCardSkeleton";
import AuthorSectionSkeleton from "@/components/book/info/AuthorSectionSkeleton";
import "./BookDetailPage.scss";
import { useAuthorData } from "@/pages/book-detail/hooks/useAuthorData";
import { useBookRecommendations } from "@/pages/book-detail/hooks/useBookRecommendations";
import { useEffect } from "react";
import { toWorkKey } from "@/utils/bookPaths";
import { ChevronLeft } from "lucide-react";
import UserReviewSection from "@/components/book/info/UserReviewSection";

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
        <section className="book-detail-page__info-section">
          <BookInfoCardSkeleton />
        </section>
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
            <ChevronLeft aria-hidden="true" />
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

      <UserReviewSection bookKey={book.key} />
      <ReviewsSection reviews={book.reviews} />

      {authorLoading
        ? <AuthorSectionSkeleton />
        : <AuthorSection authorInfo={authorInfo ?? book.authorInfo} />
      }

      {recommendedBooks.length > 0 && (
        <RecommendationsSection books={recommendedBooks} onRefresh={refreshRecs} />
      )}
    </div>
  );
}
