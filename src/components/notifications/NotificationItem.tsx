import { useNotifications } from "@/context/notifications/useNotifications";
import type { Notification } from "@/types/UserProfile";
import type { TFunction } from "i18next";
import { Check, X } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

type NotificationItemProps = {
  notification: Notification;
  onClose: () => void;
};

function timeAgo(
  timestamp: { toDate: () => Date } | null | undefined,
  t: TFunction
): string {
  if (!timestamp) {
    return "";
  }
  
  const now = Date.now();
  const then = timestamp.toDate().getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) {
    return t("notifications.time.secondsAgo");
  }

  if (diff < 3600) {
    return t("notifications.time.minutesAgo", { value: Math.floor(diff / 60) });
  }

  if (diff < 86400) {
    return t("notifications.time.hoursAgo", { value: Math.floor(diff / 3600) });
  }

  return t("notifications.time.daysAgo", { value: Math.floor(diff / 86400) });
}

export default function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { remove, acceptRequest, rejectRequest } = useNotifications();

  const displayName = notification.actorName || notification.actorUsername ||t("profile.userFallback");
  const goToProfile = () => { onClose(); navigate(`/profile/${notification.actorUid}`)}
  
  const isRequest = notification.type === "follow_request";

  return (
    <div
      className={
        "notification-item" +
        (notification.read ? "" : " notification-item--unread")
      }
    >
      <button
        type="button"
        className="notification-item__body"
        onClick={goToProfile}
      >
        {notification.actorPhotoUrl ? (
          <img
            className="notification-item__avatar"
            src={notification.actorPhotoUrl}
            alt={displayName}
          />
        ) : (
          <div className="notification-item__avatar notification-item__avatar--placeholder">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="notification-item__info">
          <p className="notification-item__text">
            <Trans
              i18nKey={`notifications.types.${notification.type}`}
              values={{ name: displayName }}
              components={[<strong />]}
            />
          </p>
          <span className="notification-item__time">
            {timeAgo(notification.createdAt, t)}
          </span>
        </div>
      </button>

      <div className="notification-item__actions">
        {isRequest ? (
          <>
            <button
              type="button"
              className="notification-item__btn notification-item__btn--accept"
              onClick={() => acceptRequest(notification.actorUid)}
              aria-label={t("notifications.actions.acceptAria")}
            >
              <Check size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="notification-item__btn notification-item__btn--reject"
              onClick={() => rejectRequest(notification.actorUid)}
              aria-label={t("notifications.actions.rejectAria")}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="notification-item__btn notification-item__btn--delete"
            onClick={() => remove(notification.id)}
            aria-label={t("notifications.actions.deleteAria")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
