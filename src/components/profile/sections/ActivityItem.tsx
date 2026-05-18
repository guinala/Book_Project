import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { ActivityItem as ActivityItemType } from "@/types/UserProfile";
import StarRating from "@/components/common/StarRating";
import "./ActivityItem.scss";
import { encodeKey } from "@/utils/bookPaths";

function timeAgo(timestamp: { toDate: () => Date }, t: TFunction): string {
  const now = Date.now();
  const then = timestamp.toDate().getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return t("profile.activity.time.secondsAgo");
  if (diff < 3600) {
    return t("profile.activity.time.minutesAgo", { value: Math.floor(diff / 60) });
  }
  if (diff < 86400) {
    return t("profile.activity.time.hoursAgo", { value: Math.floor(diff / 3600) });
  }
  return t("profile.activity.time.daysAgo", { value: Math.floor(diff / 86400) });
}

type ActivityItemProps = {
  item: ActivityItemType;
};

export default function ActivityItem({ item }: ActivityItemProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleCoverClick = item.bookId
    ? () => navigate(`/books/${encodeKey(item.bookId!)}`)
    : undefined;

  return (
    <div className="activity-item">
      {handleCoverClick ? (
        <button className="activity-item__cover-btn" onClick={handleCoverClick} aria-label={item.bookTitle ?? ""}>
          {item.bookCoverUrl ? (
            <img className="activity-item__cover" src={item.bookCoverUrl} alt="" />
          ) : (
            <div className="activity-item__cover activity-item__cover--placeholder" />
          )}
        </button>
      ) : (
        item.bookCoverUrl ? (
          <img className="activity-item__cover" src={item.bookCoverUrl} alt={item.bookTitle ?? ""} />
        ) : (
          <div className="activity-item__cover activity-item__cover--placeholder" />
        )
      )}

      <div className="activity-item__info">
        <div className="activity-item__header">
          <span className="activity-item__event">
            {t(`profile.activity.events.${item.type}`, { defaultValue: item.type })}
          </span>
          <span className="activity-item__time">
            {timeAgo(item.createdAt, t)}
          </span>
        </div>

        {item.bookTitle && (
          <p className="activity-item__book-title">{item.bookTitle}</p>
        )}
        {item.bookAuthor && (
          <p className="activity-item__book-author">{item.bookAuthor}</p>
        )}
        {item.listName && (
          <p className="activity-item__list-name">"{item.listName}"</p>
        )}
        {typeof item.rating === "number" && item.rating > 0 && (
          <StarRating rating={item.rating} size={14} />
        )}
        {item.note && (
          <p className="activity-item__note">{item.note}</p>
        )}
      </div>
    </div>
  );
}
