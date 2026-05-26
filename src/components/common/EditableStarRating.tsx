import { useId, useState } from "react";

type EditableStarRatingProps = {
  rating: number;
  onChange: (v: number) => void;
  ariaLabel?: string;
};

function StarSvg({ fill, uid }: { fill: 0 | 0.5 | 1; uid: string }) {
  const pct = fill === 1 ? "100%" : fill === 0.5 ? "50%" : "0%";
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
      <defs>
        <linearGradient id={uid}>
          <stop offset={pct} stopColor="var(--color-accent)" />
          <stop offset={pct} stopColor="var(--color-border-subtle)" />
        </linearGradient>
      </defs>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={`url(#${uid})`}
        stroke="var(--color-accent)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function EditableStarRating({ rating, onChange, ariaLabel = "Valoración" }: EditableStarRatingProps) {
  const [hover, setHover] = useState(0);
  const gradBase = useId();
  const display = hover || rating;

  const fractionFromEvent = (e: React.MouseEvent<HTMLSpanElement>, star: number): number => {
    const rect = e.currentTarget.getBoundingClientRect();
    return (e.clientX - rect.left) / rect.width < 0.5 ? star - 0.5 : star;
  };

  return (
    <div
      className="star-rating"
      onMouseLeave={() => setHover(0)}
      role="group"
      aria-label={ariaLabel}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill: 0 | 0.5 | 1 = display >= star ? 1 : display >= star - 0.5 ? 0.5 : 0;
        return (
          <span
            key={star}
            className="star-rating__star"
            role="button"
            tabIndex={0}
            aria-label={`${star} estrellas`}
            onMouseMove={(e) => setHover(fractionFromEvent(e, star))}
            onClick={(e) => onChange(fractionFromEvent(e, star))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onChange(star);
            }}
          >
            <StarSvg fill={fill} uid={`${gradBase}-${star}`} />
          </span>
        );
      })}
      {display > 0 && <span className="star-rating__value">{display} / 5</span>}
    </div>
  );
}
