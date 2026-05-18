import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
  acceptFollowRequest,
  getFollowRequests,
  rejectFollowRequest,
} from "@/services/firebase/firebaseFollows";
import type { FollowRequest } from "@/types/UserProfile";
import { Check, X } from "lucide-react";
import "./FollowRequestsModal.scss";

type FollowRequestsModalProps = {
  onClose: () => void;
  onAccepted?: () => void;
};

export default function FollowRequestsModal({
  onClose,
  onAccepted,
}: FollowRequestsModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  // uids con una acción en curso → desactiva sus botones para evitar doble clic.
  //const [busy, setBusy] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    getFollowRequests()
      .then((result) => { if (!cancelled) setRequests(result); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const resolve = async (
    request: FollowRequest,
    action: (uid: string) => Promise<void>,
  ) => {
    setRequests((rs) =>
      rs.filter((r) => r.requesterUid !== request.requesterUid)
    );
    //setBusy((b) => new Set(b).add(requesterUid));
    try {
      await action(request.requesterUid);
      if (action === acceptFollowRequest) onAccepted?.();
      //setRequests((rs) => rs.filter((r) => r.requesterUid !== requesterUid));
    } catch {
      console.error("[FollowRequestsModal] acción fallida");
      setRequests((rs) => [request, ...rs]); // rollback
      // setBusy((b) => {
      //   const next = new Set(b);
      //   next.delete(requesterUid);
      //   return next;
      // });
    }
  };

  return (
    <div className="follow-requests-modal" role="dialog" aria-modal="true">
      <div className="follow-requests-modal__backdrop" onClick={onClose} />
      <div className="follow-requests-modal__box">
        <div className="follow-requests-modal__header">
          <h2 className="follow-requests-modal__title">
            {t("profile.requests.title")}
          </h2>
          <button
            type="button"
            className="follow-requests-modal__close"
            onClick={onClose}
            aria-label={t("profile.requests.closeAria")}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="follow-requests-modal__list">
          {loading && (
            <p className="follow-requests-modal__loading">
              {t("profile.requests.loading")}
            </p>
          )}
          {!loading && requests.length === 0 && (
            <p className="follow-requests-modal__empty">
              {t("profile.requests.empty")}
            </p>
          )}
          {!loading &&
            requests.map((r) => {
              const displayName =
                r.requesterName ||
                r.requesterUsername ||
                t("profile.userFallback");
              return (
                <div
                  className="follow-requests-modal__row"
                  key={r.requesterUid}
                >
                  <button
                    type="button"
                    className="follow-requests-modal__user"
                    onClick={() => {
                      onClose();
                      navigate(`/profile/${r.requesterUid}`);
                    }}
                  >
                    {r.requesterPhotoUrl ? (
                      <img
                        className="follow-requests-modal__avatar"
                        src={r.requesterPhotoUrl}
                        alt={displayName}
                      />
                    ) : (
                      <div className="follow-requests-modal__avatar follow-requests-modal__avatar--placeholder">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="follow-requests-modal__info">
                      <p className="follow-requests-modal__name">
                        {displayName}
                      </p>
                      {r.requesterUsername && (
                        <p className="follow-requests-modal__handle">
                          @{r.requesterUsername}
                        </p>
                      )}
                    </div>
                  </button>

                  <div className="follow-requests-modal__actions">
                    <button
                      type="button"
                      className="follow-requests-modal__btn follow-requests-modal__btn--accept"
                      onClick={() => resolve(r, acceptFollowRequest)}
                      aria-label={t("profile.requests.acceptAria")}
                    >
                      <Check size={18} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="follow-requests-modal__btn follow-requests-modal__btn--reject"
                      onClick={() => resolve(r, rejectFollowRequest)}
                      aria-label={t("profile.requests.rejectAria")}
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
