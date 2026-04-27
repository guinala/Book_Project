// src/components/ActivityItem/ActivityItem.tsx
import type { ActivityItem as ActivityItemType } from "@/types/UserProfile";
import StarRating from "@/components/StarRating/StarRating";
import "./ActivityItem.scss";

const EVENT_LABELS: Record<string, string> = {
  reading_started: "Empezó a leer",
  book_finished: "Terminó de leer",
  progress: "Actualizó su progreso",
  review: "Escribió una reseña",
  list_created: "Creó una lista",
  watchlist_add: "Añadió a su lista",
};

function timeAgo(timestamp: { toDate: () => Date }): string {
  const now = Date.now();
  const then = timestamp.toDate().getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff <= 0) return "hace unos segundos";
  if (diff < 60) return "hace unos segundos";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

type ActivityItemProps = {
  item: ActivityItemType;
};

export default function ActivityItem({ item }: ActivityItemProps) {
  return (
    <div className="activity-item">
      {item.bookCoverUrl ? (
        <img
          className="activity-item__cover"
          src={item.bookCoverUrl}
          alt={item.bookTitle ?? ""}
        />
      ) : (
        <div className="activity-item__cover activity-item__cover--placeholder" />
      )}

      <div className="activity-item__info">
        <div className="activity-item__header">
          <span className="activity-item__event">
            {EVENT_LABELS[item.type] ?? item.type}
          </span>
          <span className="activity-item__time">{timeAgo(item.createdAt)}</span>
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
      </div>
    </div>
  );
}
