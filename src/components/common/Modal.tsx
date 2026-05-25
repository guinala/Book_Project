import { useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useLockScroll } from "@/hooks/useLockScroll";
import { useClickOutside } from "@/hooks/useClickOutside";

type ModalProps = {
  title?: string;
  ariaLabel?: string;
  onClose: () => void;
  children: ReactNode;
  closeOnBackdrop?: boolean;    
  usePortal?: boolean;            
  closeAriaLabel?: string;
  classNames?: Partial<{
    root: string;
    backdrop: string;
    box: string;
    header: string;
    title: string;
    close: string;
  }>;
};

export default function Modal({
  title,
  ariaLabel,
  onClose,
  children,
  closeOnBackdrop = true,
  usePortal = false,
  closeAriaLabel,
  classNames,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEscapeKey(onClose);
  useLockScroll();
  useClickOutside(panelRef, onClose, closeOnBackdrop);

  const content = (
    <div
      className={classNames?.root}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? title}
    >
      {classNames?.backdrop && <div className={classNames.backdrop} />}
      <div className={classNames?.box} ref={panelRef}>
        {(title || closeAriaLabel) && (
          <div className={classNames?.header}>
            {title && <h2 className={classNames?.title}>{title}</h2>}
            <button
              type="button"
              className={classNames?.close}
              onClick={onClose}
              aria-label={closeAriaLabel ?? "Close"}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );

  return usePortal ? createPortal(content, document.body) : content;
}
