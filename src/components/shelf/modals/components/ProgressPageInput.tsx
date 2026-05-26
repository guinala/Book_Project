import { useRef } from "react";
import { useTranslation } from "react-i18next";

type ProgressPageInputProps = {
  pageInput: string;
  setPageInput: (v: string) => void;
  totalPages: number;
  currentPage: number;
  finished: boolean;
  progressPercent: number;
};

export default function ProgressPageInput({
  pageInput,
  setPageInput,
  totalPages,
  currentPage,
  finished,
  progressPercent,
}: ProgressPageInputProps) {
  const { t } = useTranslation();
  const prevPageRef = useRef(currentPage);

  const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    const stripped = digits.replace(/^0+/, "");
    if (stripped === "") {
      setPageInput("");
      return;
    }
    const clamped = totalPages > 0
      ? Math.min(parseInt(stripped, 10), totalPages)
      : parseInt(stripped, 10);
    setPageInput(String(clamped));
  };

  const handleToggleFinished = () => {
    if (finished) {
      setPageInput(prevPageRef.current > 0 ? String(prevPageRef.current) : "");
    } else {
      prevPageRef.current = currentPage;
      setPageInput(String(totalPages));
    }
  };

  return (
    <div className="progress-modal__section">
      <div className="progress-modal__field">
        <label className="progress-modal__label" htmlFor="progress-page-input">
          {t("myLibrary.updateProgressModal.currentPage")}
        </label>
        <div className="progress-modal__page-row">
          <input
            id="progress-page-input"
            className="progress-modal__page-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pageInput}
            onChange={handlePageChange}
            onFocus={(e) => e.target.select()}
          />
          {totalPages > 0 && (
            <span className="progress-modal__page-total">
              {t("myLibrary.updateProgressModal.of")} {totalPages}
            </span>
          )}
          <span className="progress-modal__progress-pct">{progressPercent}%</span>
        </div>
        <div className="progress-modal__progress-track">
          <div
            className="progress-modal__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="progress-modal__field progress-modal__field--toggle">
        <span className="progress-modal__label">
          {t("myLibrary.updateProgressModal.finished")}
        </span>
        <button
          className={`progress-modal__toggle${finished ? " progress-modal__toggle--on" : ""}`}
          role="switch"
          aria-checked={finished}
          onClick={handleToggleFinished}
        >
          <span className="progress-modal__toggle-knob" />
        </button>
      </div>
    </div>
  );
}
