// src/components/FollowersModal/FollowersModal.tsx
import { useEffect, useState } from "react";
import { getFollowers, getFollowing } from "@/services/firebase/firebaseFollows";
import type { UserMinimal } from "@/types/UserProfile";
import ProfileCard from "@/components/profile/sections/ProfileCard";
import "./FollowersModal.scss";

type FollowersModalProps = {
  userId: string;
  mode: "followers" | "following";
  onClose: () => void;
};

export default function FollowersModal({
  userId,
  mode,
  onClose,
}: FollowersModalProps) {
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
            {mode === "followers" ? "Seguidores" : "Seguidos"}
          </h2>
          <button
            type="button"
            className="followers-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="followers-modal__list">
          {loading && (
            <p className="followers-modal__loading">Cargando...</p>
          )}
          {!loading && users.length === 0 && (
            <p className="followers-modal__empty">
              {mode === "followers"
                ? "Aún no tienes seguidores"
                : "Aún no sigues a nadie"}
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
