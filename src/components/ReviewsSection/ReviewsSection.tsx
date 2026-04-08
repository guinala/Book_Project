import { useTranslation } from "react-i18next";
import type { Review } from "@/types/BookDetail";
import ReviewCard from "@/components/ReviewCard/ReviewCard";
import "./ReviewsSection.scss";

type ReviewsSectionProps = {
  reviews: Review[];
};

export default function ReviewsSection({ reviews }: ReviewsSectionProps) {
  const { t } = useTranslation();
  return (
    <section className="reviews-section">
      <div className="reviews-section__header">
        <h2 className="reviews-section__title">{t("bookDetail.reviewsTitle")}</h2>
        <a href="#" className="reviews-section__see-more">
          {t("bookDetail.reviewsSeeMore")}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </a>
      </div>

      <div className="reviews-section__grid">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </section>
  );
}
