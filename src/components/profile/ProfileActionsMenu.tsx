import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, Link, Ban } from "lucide-react";
import "./ProfileActionsMenu.scss";

type ProfileActionsMenuProps = {
  username: string;
  name: string;
  onBlock: () => void;
};

export default function ProfileActionsMenu({
  username,
  name,
  onBlock,
}: ProfileActionsMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toastVisible) return;
    const id = window.setTimeout(() => setToastVisible(false), 2000);
    return () => window.clearTimeout(id);
  }, [toastVisible]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const handleShareLink = useCallback(async () => {
    setOpen(false);
    const url = `${window.location.origin}/u/${username}`;
    const title = name.trim() || `@${username}`;
    const text = t("profile.share.shareText", { name: title });

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setToastVisible(true);
    } catch {
      /* Error */
    }
  }, [username, name, t]);

  const handleBlock = useCallback(() => {
    setOpen(false);
    onBlock();
  }, [onBlock]);

  if (!username.trim()) return null;

  return (
    <div className="profile-actions-menu" ref={menuRef}>
      <button
        type="button"
        className="profile-actions-menu__trigger"
        aria-label={t("profile.actions.menuAriaLabel")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>

      {open && (
        <ul className="profile-actions-menu__dropdown" role="menu">
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="profile-actions-menu__item"
              onClick={handleShareLink}
            >
              <Link size={15} aria-hidden="true" />
              {t("profile.actions.shareLink")}
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="profile-actions-menu__item profile-actions-menu__item--danger"
              onClick={handleBlock}
            >
              <Ban size={15} aria-hidden="true" />
              {t("profile.actions.block")}
            </button>
          </li>
        </ul>
      )}

      {toastVisible && (
        <p className="profile-actions-menu__toast" role="status">
          {t("profile.share.copied")}
        </p>
      )}
    </div>
  );
}
