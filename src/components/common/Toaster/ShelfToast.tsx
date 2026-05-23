import { toast as sonnerToast } from "sonner";
import "./ShelfToast.scss";

type ShelfToastProps = {
  cover: string | null;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  toastId: string | number;
};

export default function ShelfToast({
  cover,
  title,
  message,
  actionLabel,
  onAction,
  toastId,
}: ShelfToastProps) {
  return (
    <div className="shelf-toast">
      <div className="shelf-toast__cover-wrap">
        {cover ? (
          <img className="shelf-toast__cover" src={cover} alt="" />
        ) : (
          <div className="shelf-toast__cover-placeholder" />
        )}
      </div>
      <div className="shelf-toast__body">
        <p className="shelf-toast__title">{title}</p>
        <p className="shelf-toast__message">{message}</p>
      </div>
      {actionLabel && onAction && (
        <button
          className="shelf-toast__action"
          onClick={() => {
            onAction();
            sonnerToast.dismiss(toastId);
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
