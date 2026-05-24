import { useEffect, useRef } from "react";
import NotificationItem from "./NotificationItem";
import { useTranslation } from "react-i18next";
import { useNotifications } from "@/hooks/useNotifications";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useClickOutside } from "@/hooks/useClickOutside";

type NotificationsDropdownProps = {
  onClose: () => void;
};

export default function NotificationsDropdown({ onClose }: NotificationsDropdownProps) {
  const { t } = useTranslation();
  const { notifications, loading, markAllRead } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  useEscapeKey(onClose);
  useClickOutside(ref, onClose);

  // Marcar todas como leídas al abrir.
  useEffect(() => {
    void markAllRead();
  }, [markAllRead]);

  return (
    <div className="notifications-dropdown" ref={ref} role="menu">
      <div className="notifications-dropdown__header">
        <h2 className="notifications-dropdown__title">
          {t("notifications.title")}
        </h2>
      </div>

      <div className="notifications-dropdown__list">
        {loading && (
          <p className="notifications-dropdown__state">
            {t("notifications.loading")}
          </p>
        )}
        {!loading && notifications.length === 0 && (
          <p className="notifications-dropdown__state">
            {t("notifications.empty")}
          </p>
        )}
        {!loading &&
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onClose={onClose} />
          ))}
      </div>
    </div>
  );
}
