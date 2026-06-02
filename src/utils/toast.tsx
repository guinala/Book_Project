import { toast as sonnerToast } from "sonner";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import i18n from "@/plugins/i18n/i18n";
import ShelfToast from "@/components/common/Toaster/ShelfToast";

type BookForToast = Pick<Book, "key" | "title" | "cover_url">;
type UndoFn = () => void | Promise<void>;

const shelfLabel = (status: ShelfStatus): string =>
  i18n.t(`myLibrary.shelf.${status}`);

const renderShelfToast = (
  book: BookForToast,
  message: string,
  undo?: UndoFn,
): void => {
  sonnerToast.custom(
    (id) => (
      <ShelfToast
        toastId={id}
        cover={book.cover_url ?? null}
        title={book.title}
        message={message}
        actionLabel={undo ? i18n.t("toasts.shelf.undo") : undefined}
        onAction={undo}
      />
    ),
    { duration: 5000 }
  );
};

export function notifyShelfAdded(
  book: BookForToast,
  status: ShelfStatus,
  undo: UndoFn,
): void {
  const message = i18n.t("toasts.shelf.added", {
    title: book.title,
    shelf: shelfLabel(status),
  });
  renderShelfToast(book, message, undo);
}

export function notifyShelfStatusChanged(
  book: BookForToast,
  _fromStatus: ShelfStatus,
  toStatus: ShelfStatus,
  undo: UndoFn,
): void {
  const key =
    toStatus === "finished"
      ? "toasts.shelf.finished"
      : toStatus === "didNotFinish"
        ? "toasts.shelf.didNotFinish"
        : "toasts.shelf.statusChanged";

  const message = i18n.t(key, {
    title: book.title,
    shelf: shelfLabel(toStatus),
  });
  renderShelfToast(book, message, undo);
}

export function notifyShelfRemoved(
  book: BookForToast,
  _prevStatus: ShelfStatus,
  undo: UndoFn,
): void {
  const message = i18n.t("toasts.shelf.removed", { title: book.title });
  renderShelfToast(book, message, undo);
}

export function notifyProgressUpdated(
  book: BookForToast,
  _currentPage: number,
  _totalPages?: number,
): void {
  const message = i18n.t("toasts.shelf.progressUpdated", { title: book.title });
  renderShelfToast(book, message);
}

export const toast = {
  success: sonnerToast.success,
  error: sonnerToast.error,
  info: sonnerToast.info,
  dismiss: sonnerToast.dismiss,
};
