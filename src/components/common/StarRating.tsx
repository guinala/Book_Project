import { useTranslation } from "react-i18next";
import "./StarRating.scss";

type StarRatingProps = {
  rating: number;
  size?: number;
};

export default function StarRating({ rating, size = 16 }: StarRatingProps) {
  const { t } = useTranslation();
  
  return (
    <div className="star-rating" aria-label={t("book.starRatingLabel", { rating })}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = rating >= i;
        const half = !filled && rating >= i - 0.5;
        const gradientId = `star-half-${i}-${Math.round(rating * 10)}`;

        return (
          <svg
            key={i}
            className="star-rating__star"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {half ? (
              <>
                <defs>
                  <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
                    <stop offset="50%" stopColor="var(--color-accent)" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill={`url(#${gradientId})`}
                  stroke="var(--color-accent)"
                  strokeWidth="1.5"
                />
              </>
            ) : (
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={filled ? "var(--color-accent)" : "none"}
                stroke={filled ? "var(--color-accent)" : "var(--color-text-tertiary)"}
                strokeWidth="1.5"
              />
            )}
          </svg>
        );
      })}
    </div>
  );
}
