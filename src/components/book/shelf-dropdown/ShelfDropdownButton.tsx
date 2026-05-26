import { useAuth } from "@/context/auth/useAuth";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useShelf } from "@/context/shelf/useShelf";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { bem } from "@/utils/className";
import { Bookmark, ChevronRight, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const SHELF_OPTIONS: ShelfStatus[] = ["wantToRead", "reading", "finished", "didNotFinish"];

type Variant = "compact" | "featured" | "detail";

type ShelfDropdownButtonProps = {
  book: Book;
  variant: Variant;
  classNames?: Partial<{
    root: string;
    btn: string;
    list: string;
    item: string;
    tooltip: string;
    icon: string;
  }>;
};

export default function ShelfDropdownButton({ book, variant, classNames }: ShelfDropdownButtonProps) {
  const { t } = useTranslation();
  const { addBook, removeBook, getStatus } = useShelf();
  const { isAuthenticated } = useAuth();
  const saved = getStatus(book.key);

  const [open, setOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useClickOutside(wrapperRef, () => setOpen(false), open);

  useEffect(() => () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
  }, []);

  const handleSaveBtnClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setTooltipVisible(true);
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = setTimeout(() => setTooltipVisible(false), 2000);
      return;
    }
    setOpen((o) => !o);
  };

  const handleSelect = (e: React.MouseEvent, status: ShelfStatus) => {
    e.stopPropagation();
    if (saved === status) removeBook(book.key);
    else addBook(book, status);
    setOpen(false);
  };

  const isSavedDisplay = !!saved && !open;

  const buttonInner = (() => {
    if (variant === "compact") {
      return isSavedDisplay ? (
        <Bookmark className={classNames?.icon} fill="currentColor" stroke="none" />
      ) : (
        <Plus className={bem(classNames?.icon, { open })} />
      );
    }
    if (variant === "featured") {
      return isSavedDisplay ? (
        <>
          <Bookmark size={14} fill="currentColor" stroke="none" />
          {t("book.saved")}
        </>
      ) : (
        t("book.save")
      );
    }
    // detail
    return (
      <>
        {isSavedDisplay && <Bookmark className={classNames?.icon} />}
        {isSavedDisplay ? t(`myLibrary.shelf.${saved}`) : t("bookDetail.saveBook")}
        <ChevronRight />
      </>
    );
  })();

  return (
    <div className={bem(classNames?.root, { open })} ref={wrapperRef}>
      {tooltipVisible && classNames?.tooltip && (
        <span className={classNames.tooltip}>{t("explore.saveTooltip")}</span>
      )}

      <button
        type="button"
        className={bem(classNames?.btn, { open, saved: isSavedDisplay })}
        onClick={handleSaveBtnClick}
        aria-label={t("book.save")}
      >
        {buttonInner}
      </button>

      {open && (
        <ul
          className={classNames?.list}
          onClick={(e) => e.stopPropagation()}
        >
          {SHELF_OPTIONS.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                className={bem(classNames?.item, { active: saved === opt })}
                onClick={(e) => handleSelect(e, opt)}
              >
                {saved === opt && <Bookmark size={16} />}
                {t(`myLibrary.shelf.${opt}`)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}