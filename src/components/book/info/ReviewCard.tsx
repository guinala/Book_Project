import { useTranslation } from "react-i18next";
import type { Review } from "@/types/BookDetail";
import StarRating from "@/components/common/StarRating";
import "./ReviewCard.scss";

type ReviewCardProps = {
  review: Review;
};

export default function ReviewCard({ review }: ReviewCardProps) {
  const { t } = useTranslation();
  return (
    <article className="review-card">
      <div className="review-card__header">
        <div className="review-card__avatar" aria-hidden="true">
          {review.name.charAt(0)}
        </div>
        <div className="review-card__user">
          <span className="review-card__name">{review.name}</span>
          <span className="review-card__handle">{review.handle}</span>
        </div>
        <div className="review-card__meta">
          <StarRating rating={review.rating} size={13} />
          <span className="review-card__date">{review.date}</span>
        </div>
      </div>

      <div className="review-card__text-box">
        <p className="review-card__text">{review.text}</p>
      </div>

      <div className="review-card__footer">
        <button className="review-card__action" aria-label={t("bookDetail.likeAriaLabel", { count: review.likes })}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>{review.likes}</span>
        </button>
        <button
          className="review-card__action"
          aria-label={t("bookDetail.commentAriaLabel", { count: review.comments })}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{review.comments}</span>
        </button>
      </div>
    </article>
  );
}
