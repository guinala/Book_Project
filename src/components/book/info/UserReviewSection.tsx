import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/auth/useAuth";
import { useShelf } from "@/context/shelf/useShelf";
import { getUserProfile } from "@/services/firebase/firebaseUsers";
import type { UserFullProfile } from "@/types/UserProfile";
import StarRating from "@/components/common/StarRating";
import "./UserReviewSection.scss";

type UserReviewSectionProps = {
  bookKey: string;
};

export default function UserReviewSection({ bookKey }: UserReviewSectionProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getEntry } = useShelf();
  const entry = getEntry(bookKey);

  const hasRating = entry?.rating !== undefined && entry.rating > 0;
  const hasReview = entry?.review !== undefined && entry.review.trim().length > 0;
  const hasContent = hasRating || hasReview;
  const shouldRender = !!user && entry?.status === "finished" && hasContent;

  const [profile, setProfile] = useState<UserFullProfile | null>(null);
  const uid = user?.uid;

  useEffect(() => {
    if (!shouldRender || !uid) return;
    let cancelled = false;
    getUserProfile(uid)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        /* silent: si falla, el componente no renderiza */
      });
    return () => {
      cancelled = true;
    };
  }, [shouldRender, uid]);

  if (!shouldRender || !profile || !entry) return null;

  const initial = profile.name?.charAt(0).toUpperCase() ?? "?";
  const displayName = `${profile.name} ${profile.surname}`.trim();

  return (
    <section className="user-review-section">
      <h2 className="user-review-section__title">
        {t("bookDetail.yourReviewTitle")}
      </h2>

      <article className="user-review-section__card">
        <header className="user-review-section__header">
          {profile.profilePhotoUrl ? (
            <img
              className="user-review-section__avatar"
              src={profile.profilePhotoUrl}
              alt=""
            />
          ) : (
            <div
              className="user-review-section__avatar user-review-section__avatar--placeholder"
              aria-hidden="true"
            >
              {initial}
            </div>
          )}

          <div className="user-review-section__user">
            <span className="user-review-section__name">{displayName}</span>
            <span className="user-review-section__handle">
              @{profile.username}
            </span>
          </div>

          {hasRating && entry.rating !== undefined && (
            <div className="user-review-section__rating">
              <StarRating rating={entry.rating} size={20} />
              <span className="user-review-section__rating-value">
                {entry.rating} / 5
              </span>
            </div>
          )}
        </header>

        {hasReview && entry.review && (
          <div className="user-review-section__text-box">
            <p className="user-review-section__text">{entry.review}</p>
          </div>
        )}
      </article>
    </section>
  );
}
