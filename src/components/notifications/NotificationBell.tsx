import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationsDropdown from "./NotificationsDropdown";
import "./Notifications.scss";

export default function NotificationsBell() {
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="navbar__bell-wrap">
      <button
        className="navbar__btn-icon"
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={
          unreadCount > 0
            ? t("notifications.ariaUnread", { count: unreadCount })
            : t("notifications.ariaBell")
        }
        onClick={() => setOpen((o) => !o)}
      >
        <Bell />
        {unreadCount > 0 && (
          <span className="navbar__bell-badge" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && <NotificationsDropdown onClose={() => setOpen(false)} />}
    </div>
  );
}
