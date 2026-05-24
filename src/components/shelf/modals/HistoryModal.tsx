import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { getActivity } from "@/services/firebase/firebaseActivity";
import { encodeKey } from "@/utils/bookPaths";
import type { ActivityItem } from "@/types/UserProfile";
import { X } from "lucide-react";
import "./HistoryModal.scss";
import { useTranslation } from "react-i18next";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useLockScroll } from "@/hooks/useLockScroll";
import { useClickOutside } from "@/hooks/useClickOutside";

function timeAgo(timestamp: { toDate: () => Date }, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Math.floor((Date.now() - timestamp.toDate().getTime()) / 1000);
  if (diff < 60) return t("myLibrary.historyModal.timeAgo.seconds");
  if (diff < 3600) return t("myLibrary.historyModal.timeAgo.minutes", { n: Math.floor(diff / 60) });
  if (diff < 86400) return t("myLibrary.historyModal.timeAgo.hours", { n: Math.floor(diff / 3600) });
  return t("myLibrary.historyModal.timeAgo.days", { n: Math.floor(diff / 86400) });
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


function HistoryEntry({ item, totalPages, t }: {
  item: EntryWithDelta;
  totalPages: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const hasPages = item.type === "progress" && typeof item.progress === "number";
  const eventKey = `myLibrary.historyModal.events.${item.type}`;
  const eventLabel = t(eventKey);

  return (
    <div className="history-entry">
      <div className="history-entry__header">
        <span className="history-entry__event">{eventLabel === eventKey ? item.type : eventLabel}</span>
        <span className="history-entry__time">{timeAgo(item.createdAt, t)}</span>
      </div>

      {hasPages && (
        <div className="history-entry__pages">
          <span className="history-entry__pages-progress">
            {totalPages > 0
              ? t("myLibrary.historyModal.pageProgress", { current: item.progress, total: totalPages })
              : t("myLibrary.historyModal.pageProgressNoTotal", { current: item.progress })}
          </span>
          {typeof item.addedPages === "number" && item.addedPages > 0 && (
            <span className="history-entry__pages-added">{t("myLibrary.historyModal.pagesAdded", { count: item.addedPages })}</span>
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEscapeKey(onClose);
  useLockScroll();
  useClickOutside(panelRef, onClose);

  useEffect(() => {
    if (!user) {
      return;
    }
    let cancelled = false;
    getActivity(user.uid, 50)
      .then((all) => { if (!cancelled) setItems(all.filter((a) => a.bookId === bookId)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, user?.uid, bookId]);

  const entries = computeDeltas(items, totalPages);

  return createPortal(
    <div
      className="history-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t("myLibrary.historyModal.ariaLabel")}
    >
      <div className="history-modal__panel" ref={panelRef}>
        <div className="history-modal__header">
          <h2 className="history-modal__title">{t("myLibrary.historyModal.title")}</h2>
          <button
            className="history-modal__close"
            onClick={onClose}
            aria-label={t("myLibrary.historyModal.closeAria")}
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
              <p className="history-modal__empty">{t("myLibrary.historyModal.loading")}</p>
            )}
            {!loading && entries.length === 0 && (
              <p className="history-modal__empty">
                {t("myLibrary.historyModal.empty")}
              </p>
            )}
            {!loading && entries.map((item, idx, arr) => (
              <div key={item.id}>
                <HistoryEntry item={item} totalPages={totalPages} t={t} />
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
