import { useTranslation } from "react-i18next";
import "./ShareProfileButton.scss";
import { useCallback, useEffect, useState } from "react";
import { Share2 } from "lucide-react";

type ShareProfileButtonProps = {
  username: string;
  name: string;
};

export default function ShareProfileButton({
  username,
  name,
}: ShareProfileButtonProps) {
  const { t } = useTranslation();
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (!toastVisible) return;
    const id = window.setTimeout(() => setToastVisible(false), 2000);
    return () => window.clearTimeout(id);
  }, [toastVisible]);

  const handleClick = useCallback(async () => {
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
      /*si*/
    }
  }, [username, name, t]);

  if (!username.trim()) {
    return null;
  }
  return (
    <div className="share-profile-button">
      <button
        type="button"
        className="share-profile-button__btn"
        onClick={handleClick}
        aria-label={t("profile.share.ariaLabel")}
      >
      <Share2 size={18} aria-hidden="true" />
      </button>
      {toastVisible && (
        <p className="share-profile-button__toast" role="status">
          {t("profile.share.copied")}
        </p>
      )}
    </div>
  );
}
