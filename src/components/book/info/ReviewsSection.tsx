import { useTranslation } from "react-i18next";
import type { Review } from "@/types/BookDetail";
import ReviewCard from "@/components/book/info/ReviewCard";
import { ChevronRight } from "lucide-react";
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
          <ChevronRight />
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
