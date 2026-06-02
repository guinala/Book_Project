import { createPortal } from "react-dom";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bookmark, BookOpen, BookCheck, BookX, ChevronDown } from "lucide-react";
import type { ShelfStatus } from "@/types/BookDetail";
import { useClickOutsideMany } from "@/hooks/useClickOutside";
import "./ModalStatusSelect.scss";

const SHELF_OPTIONS: ShelfStatus[] = ["wantToRead", "reading", "finished", "didNotFinish"];

const STATUS_ICONS: Record<ShelfStatus, React.ElementType> = {
  wantToRead: Bookmark,
  reading: BookOpen,
  finished: BookCheck,
  didNotFinish: BookX,
};

type ModalStatusSelectProps = {
  value: ShelfStatus;
  onChange: (status: ShelfStatus) => void;
};

export default function ModalStatusSelect({ value, onChange }: ModalStatusSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const close = useCallback(() => setOpen(false), []);
  useClickOutsideMany(
    [btnRef as React.RefObject<HTMLElement>, listRef as React.RefObject<HTMLElement>],
    close,
    open
  );

  const handleToggle = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen((o) => !o);
  };

  const handleSelect = (status: ShelfStatus) => {
    onChange(status);
    setOpen(false);
  };

  const Icon = STATUS_ICONS[value];

  return (
    <div className="modal-status-select">
      <button
        ref={btnRef}
        type="button"
        className={`modal-status-select__btn${open ? " modal-status-select__btn--open" : ""}`}
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="modal-status-select__status">
          <Icon size={14} aria-hidden="true" />
          <span>{t(`myLibrary.shelf.${value}`)}</span>
        </span>
        <ChevronDown
          size={13}
          aria-hidden="true"
          className={`modal-status-select__chevron${open ? " modal-status-select__chevron--open" : ""}`}
        />
      </button>

      {open &&
        createPortal(
          <ul
            ref={listRef}
            role="menu"
            className="modal-status-select__list"
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 9999,
            }}
          >
            {SHELF_OPTIONS.map((opt) => {
              const OptIcon = STATUS_ICONS[opt];
              return (
                <li key={opt}>
                  <button
                    role="menuitem"
                    type="button"
                    className={`modal-status-select__option${opt === value ? " modal-status-select__option--active" : ""}`}
                    onClick={() => handleSelect(opt)}
                  >
                    <OptIcon size={14} aria-hidden="true" />
                    {t(`myLibrary.shelf.${opt}`)}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}
