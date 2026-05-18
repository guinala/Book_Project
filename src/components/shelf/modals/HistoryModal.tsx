import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { getActivity } from "@/services/firebase/firebaseActivity";
import { encodeKey } from "@/utils/bookPaths";
import type { ActivityItem } from "@/types/UserProfile";
import { X } from "lucide-react";
import "./HistoryModal.scss";

const EVENT_LABELS: Record<string, string> = {
  reading_started: "Empezaste a leer",
  book_finished: "Terminaste de leer",
  progress: "Actualizaste el progreso",
  review: "Escribiste una reseña",
  list_created: "Creaste una lista",
  watchlist_add: "Añadiste a la lista",
};

function timeAgo(timestamp: { toDate: () => Date }): string {
  const diff = Math.floor((Date.now() - timestamp.toDate().getTime()) / 1000);
  if (diff < 60) return "hace unos segundos";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

type EntryWithDelta = ActivityItem & {
  prevProgress?: number;
  addedPages?: number;
  remaining?: number;
};

function computeDeltas(items: ActivityItem[], totalPages: number): EntryWithDelta[] {
  const sorted = [...items].sort(
    (a, b) => a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime()
  );
  let lastProgress = 0;
  const result: EntryWithDelta[] = sorted.map(item => {
    if (item.type === "progress" && typeof item.progress === "number") {
      const prev = lastProgress;
      const added = item.progress - prev;
      const remaining = totalPages > 0 ? totalPages - item.progress : undefined;
      lastProgress = item.progress;
      return { ...item, prevProgress: prev, addedPages: added, remaining };
    }
    return item;
  });
  return result.reverse();
}


function HistoryEntry({ item, totalPages }: { item: EntryWithDelta; totalPages: number }) {
  const hasPages = item.type === "progress" && typeof item.progress === "number";

  return (
    <div className="history-entry">
      <div className="history-entry__header">
        <span className="history-entry__event">{EVENT_LABELS[item.type] ?? item.type}</span>
        <span className="history-entry__time">{timeAgo(item.createdAt)}</span>
      </div>

      {hasPages && (
        <div className="history-entry__pages">
          <span className="history-entry__pages-progress">
            {item.progress}{totalPages > 0 ? `/${totalPages}` : ""} pág.
          </span>
          {typeof item.addedPages === "number" && item.addedPages > 0 && (
            <span className="history-entry__pages-added">+{item.addedPages} pág.</span>
          )}
        </div>
      )}

      {item.note && (
        <p className="history-entry__note">{item.note}</p>
      )}
    </div>
  );
}

type HistoryModalProps = {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl?: string;
  totalPages?: number;
  onClose: () => void;
};

export default function HistoryModal({
  bookId,
  bookTitle,
  bookAuthor,
  bookCoverUrl,
  totalPages = 0,
  onClose,
}: HistoryModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getActivity(user.uid, 50)
      .then((all) => setItems(all.filter((a) => a.bookId === bookId)))
      .finally(() => setLoading(false));
  }, [user, bookId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const entries = computeDeltas(items, totalPages);

  return createPortal(
    <div
      className="history-modal"
      onMouseDown={handleBackdropMouseDown}
      role="dialog"
      aria-modal="true"
      aria-label="Historial de actividad"
    >
      <div className="history-modal__panel" ref={panelRef}>
        <div className="history-modal__header">
          <h2 className="history-modal__title">Historial de actividad</h2>
          <button
            className="history-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X />
          </button>
        </div>

        <div className="history-modal__body">
          <div className="history-modal__left">
            <div className="history-modal__book-info">
              <button
                className="history-modal__cover-btn"
                onClick={() => { onClose(); navigate(`/books/${encodeKey(bookId)}`); }}
                aria-label={bookTitle}
              >
                {bookCoverUrl ? (
                  <img className="history-modal__cover" src={bookCoverUrl} alt="" />
                ) : (
                  <div className="history-modal__cover history-modal__cover--placeholder" />
                )}
              </button>
              <p className="history-modal__book-title">{bookTitle}</p>
              <p className="history-modal__book-author">{bookAuthor}</p>
            </div>
          </div>

          <div className="history-modal__divider" aria-hidden="true" />

          <div className="history-modal__right">
            {loading && (
              <p className="history-modal__empty">Cargando...</p>
            )}
            {!loading && entries.length === 0 && (
              <p className="history-modal__empty">
                Sin actividad registrada para este libro.
              </p>
            )}
            {!loading && entries.map((item, idx, arr) => (
              <div key={item.id}>
                <HistoryEntry item={item} totalPages={totalPages} />
                {idx < arr.length - 1 && (
                  <div className="history-modal__item-divider" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
