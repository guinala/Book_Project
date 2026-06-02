import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bookmark, BookOpen, BookCheck, BookX,
  ChevronDown, ListPlus,
} from "lucide-react";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { useAuth } from "@/context/auth/useAuth";
import { useShelf } from "@/context/shelf/useShelf";
import { useClickOutside, useClickOutsideMany } from "@/hooks/useClickOutside";
import { bem } from "@/utils/className";
import AddToListModal from "./AddToListModal";
import "./ShelfStatusDropdown.scss";

const SHELF_OPTIONS: ShelfStatus[] = ["wantToRead", "reading", "finished", "didNotFinish"];

const STATUS_ICONS: Record<ShelfStatus, React.ElementType> = {
  wantToRead: Bookmark,
  reading: BookOpen,
  finished: BookCheck,
  didNotFinish: BookX,
};

type ShelfStatusDropdownProps = {
  book: Book;
  portal?: boolean;
  classNames?: Partial<{
    root: string;
    btn: string;
    list: string;
    item: string;
    tooltip: string;
  }>;
};

export default function ShelfStatusDropdown({ book, classNames, portal = false }: ShelfStatusDropdownProps) {
  const { t } = useTranslation();
  const { addBook, removeBook, getStatus } = useShelf();
  const { isAuthenticated, user } = useAuth();
  const saved = getStatus(book.key);

  const [open, setOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const floatingRef = useRef<HTMLUListElement>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeDropdown = useCallback(() => setOpen(false), []);

  useClickOutside(wrapperRef, closeDropdown, !portal && open);
  useClickOutsideMany([wrapperRef, floatingRef], closeDropdown, portal && open);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setTooltipVisible(true);
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = setTimeout(() => setTooltipVisible(false), 2000);
      return;
    }
    if (portal && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4 + window.scrollY, left: rect.left + window.scrollX });
    }
    setOpen((o) => !o);
  };

  const handleStatusSelect = (e: React.MouseEvent, status: ShelfStatus) => {
    e.stopPropagation();
    if (saved === status) removeBook(book.key);
    else addBook(book, status);
    setOpen(false);
  };

  const handleOpenListModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    setListModalOpen(true);
  };

  const StatusIcon = saved ? STATUS_ICONS[saved] : null;

  const dropdownContent = (
    <ul
      ref={portal ? floatingRef : undefined}
      className={classNames?.list}
      style={portal ? { position: "absolute", top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 } : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      {SHELF_OPTIONS.map((opt) => {
        const Icon = STATUS_ICONS[opt];
        return (
          <li key={opt}>
            <button
              type="button"
              className={bem(classNames?.item, { active: saved === opt })}
              onClick={(e) => handleStatusSelect(e, opt)}
            >
              <Icon size={14} />
              {t(`myLibrary.shelf.${opt}`)}
            </button>
          </li>
        );
      })}

      {isAuthenticated && (
        <>
          <li role="separator" aria-hidden="true" className="shelf-status-dropdown__separator" />
          <li>
            <button
              type="button"
              className={classNames?.item}
              onClick={handleOpenListModal}
            >
              <ListPlus size={14} />
              {t("book.addToList")}
            </button>
          </li>
        </>
      )}
    </ul>
  );

  return (
    <div className={bem(classNames?.root, { open })} ref={wrapperRef}>
      {tooltipVisible && (
        <span className={classNames?.tooltip ?? "shelf-status-dropdown__tooltip"}>
          {t("explore.saveTooltip")}
        </span>
      )}

      <button
        ref={btnRef}
        type="button"
        className={bem(classNames?.btn, { open, saved: !!saved })}
        onClick={handleTriggerClick}
        aria-label={saved ? t(`myLibrary.shelf.${saved}`) : t("book.add")}
      >
        {StatusIcon && <StatusIcon size={14} />}
        <span>{saved ? t(`myLibrary.shelf.${saved}`) : t("book.add")}</span>
        <ChevronDown
          size={13}
          className={bem("shelf-status-dropdown__chevron", { open })}
        />
      </button>

      {open && (portal ? createPortal(dropdownContent, document.body) : dropdownContent)}

      {listModalOpen && user && (
        <AddToListModal
          book={book}
          userId={user.uid}
          onClose={() => setListModalOpen(false)}
        />
      )}
    </div>
  );
}
