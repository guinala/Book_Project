import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getFollowers, getFollowing } from "@/services/firebase/firebaseFollows";
import type { UserMinimal } from "@/types/UserProfile";
import ProfileCard from "@/components/profile/sections/ProfileCard";
import { X } from "lucide-react";
import "./FollowersModal.scss";

type FollowersModalProps = {
  userId: string;
  mode: "followers" | "following";
  isOwnProfile: boolean;
  onClose: () => void;
};

export default function FollowersModal({
  userId,
  mode,
  isOwnProfile,
  onClose,
}: FollowersModalProps) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserMinimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevDeps, setPrevDeps] = useState({ userId, mode });
  if (userId !== prevDeps.userId || mode !== prevDeps.mode) {
    setPrevDeps({ userId, mode });
    setLoading(true);
    setUsers([]);
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const fetchFn = mode === "followers" ? getFollowers : getFollowing;
    fetchFn(userId)
      .then((result) => { if (!cancelled) setUsers(result); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, mode]);

  return (
    <div className="followers-modal" role="dialog" aria-modal="true">
      <div className="followers-modal__backdrop" onClick={onClose} />
      <div className="followers-modal__box">
        <div className="followers-modal__header">
          <h2 className="followers-modal__title">
            {mode === "followers"
              ? t("profile.followList.followersTitle")
              : t("profile.followList.followingTitle")}
          </h2>
          <button
            type="button"
            className="followers-modal__close"
            onClick={onClose}
            aria-label={t("profile.followList.closeAria")}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="followers-modal__list">
          {loading && (
            <p className="followers-modal__loading">
              {t("profile.followList.loading")}
            </p>
          )}
          {!loading && users.length === 0 && (
            <p className="followers-modal__empty">
              {mode === "followers"
                ? t(isOwnProfile ? "profile.followList.emptyFollowers" : "profile.followList.emptyFollowersOther")
                : t(isOwnProfile ? "profile.followList.emptyFollowing" : "profile.followList.emptyFollowingOther")}
            </p>
          )}
          {!loading &&
            users.map((u) => (
              <ProfileCard key={u.uid} user={u} onClose={onClose} />
            ))}
        </div>
      </div>
    </div>
  );
}
