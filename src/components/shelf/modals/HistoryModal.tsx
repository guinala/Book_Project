import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/hooks/useAuth";
import { getActivity } from "@/services/firebase/firebaseActivity";
import type { ActivityItem as ActivityItemType } from "@/types/UserProfile";
import ActivityItem from "@/components/profile/sections/ActivityItem";
import "./HistoryModal.scss";

type HistoryModalProps = {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl?: string;
  onClose: () => void;
}

export default function HistoryModal({
  bookId,
  bookTitle,
  bookAuthor,
  bookCoverUrl,
  onClose,
}: HistoryModalProps) {
  const { user } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<ActivityItemType[]>([]);
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="history-modal__body">
          <div className="history-modal__left">
            <div className="history-modal__book-info">
              {bookCoverUrl ? (
                <img className="history-modal__cover" src={bookCoverUrl} alt="" />
              ) : (
                <div className="history-modal__cover history-modal__cover--placeholder" />
              )}
              <p className="history-modal__book-title">{bookTitle}</p>
              <p className="history-modal__book-author">{bookAuthor}</p>
            </div>
          </div>

          <div className="history-modal__divider" aria-hidden="true" />

          <div className="history-modal__right">
            {loading && (
              <p className="history-modal__empty">Cargando...</p>
            )}
            {!loading && items.length === 0 && (
              <p className="history-modal__empty">
                Sin actividad registrada para este libro.
              </p>
            )}
            {!loading && items.map((item, idx, arr) => (
              <div key={item.id}>
                <ActivityItem item={item} />
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
