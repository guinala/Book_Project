import { useTranslation } from "react-i18next";
import type { Review } from "@/types/BookDetail";
import StarRating from "@/components/common/StarRating";
import { Heart, MessageCircle } from "lucide-react";
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
          <Heart />
          <span>{review.likes}</span>
        </button>
        <button
          className="review-card__action"
          aria-label={t("bookDetail.commentAriaLabel", { count: review.comments })}
        >
          <MessageCircle />
          <span>{review.comments}</span>
        </button>
      </div>
    </article>
  );
}
