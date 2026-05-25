import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getFollowers, getFollowing, removeFollower } from "@/services/firebase/firebaseFollows";
import type { UserMinimal } from "@/types/UserProfile";
import ProfileCard from "@/components/profile/sections/ProfileCard";
import { UserMinus } from "lucide-react";
import "./FollowersModal.scss";
import { logger } from "@/utils/logger";
import Modal from "@/components/common/Modal";

type FollowersModalProps = {
  userId: string;
  mode: "followers" | "following";
  isOwnProfile?: boolean;
  onClose: () => void;
  onFollowerRemoved?: () => void;
};

export default function FollowersModal({
  userId, mode, isOwnProfile = false, onClose, onFollowerRemoved,
}: FollowersModalProps) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserMinimal[]>([]);
  const [loading, setLoading] = useState(true);

  const canRemove = isOwnProfile && mode === "followers";

  const handleRemove = async (followerUid: string) => {
    const removed = users.find((u) => u.uid === followerUid);
    setUsers((prev) => prev.filter((u) => u.uid !== followerUid));
    try {
      await removeFollower(followerUid);
      onFollowerRemoved?.();
    } catch {
      logger.error("[FollowersModal] removeFollower failed");
      if (removed) setUsers((prev) => [...prev, removed]);
    }
  };

  const [prevDeps, setPrevDeps] = useState({ userId, mode });
  if (userId !== prevDeps.userId || mode !== prevDeps.mode) {
    setPrevDeps({ userId, mode });
    setLoading(true);
    setUsers([]);
  }

  useEffect(() => {
    let cancelled = false;
    const fetchFn = mode === "followers" ? getFollowers : getFollowing;
    fetchFn(userId)
      .then((result) => { if (!cancelled) setUsers(result); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, mode]);

  const title = mode === "followers"
    ? t("profile.followList.followersTitle")
    : t("profile.followList.followingTitle");

  return (
    <Modal
      title={title}
      closeAriaLabel={t("profile.followList.closeAria")}
      onClose={onClose}
      classNames={{
        root: "followers-modal",
        backdrop: "followers-modal__backdrop",
        box: "followers-modal__box",
        header: "followers-modal__header",
        title: "followers-modal__title",
        close: "followers-modal__close",
      }}
    >
      <div className="followers-modal__list">
        {loading && (
          <p className="followers-modal__loading">{t("profile.followList.loading")}</p>
        )}
        {!loading && users.length === 0 && (
          <p className="followers-modal__empty">
            {mode === "followers"
              ? t(isOwnProfile ? "profile.followList.emptyFollowers" : "profile.followList.emptyFollowersOther")
              : t(isOwnProfile ? "profile.followList.emptyFollowing" : "profile.followList.emptyFollowingOther")}
          </p>
        )}
        {!loading &&
          users.map((u) =>
            canRemove ? (
              <div key={u.uid} className="followers-modal__item">
                <ProfileCard user={u} onClose={onClose} />
                <button
                  type="button"
                  className="followers-modal__remove"
                  onClick={() => handleRemove(u.uid)}
                  aria-label={t("profile.followList.removeAria")}
                >
                  <UserMinus size={16} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <ProfileCard key={u.uid} user={u} onClose={onClose} />
            )
          )}
      </div>
    </Modal>
  );
}
