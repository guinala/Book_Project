import { useTranslation } from "react-i18next";

type ProgressPageInputProps = {
  pageInput: string;
  setPageInput: (v: string) => void;
  percentInput: string;
  setPercentInput: (v: string) => void;
  totalPages: number;
  progressPercent: number;
};

export default function ProgressPageInput({
  pageInput,
  setPageInput,
  percentInput,
  setPercentInput,
  totalPages,
  progressPercent,
}: ProgressPageInputProps) {
  const { t } = useTranslation();

  const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "");
    if (digits === "") {
      setPageInput("");
      setPercentInput("0");
      return;
    }
    const raw = parseInt(digits, 10);
    const clamped = totalPages > 0 ? Math.min(raw, totalPages) : raw;
    setPageInput(String(clamped));
    if (totalPages > 0) {
      setPercentInput(String(Math.round((clamped / totalPages) * 100)));
    }
  };

  const handlePercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "");
    if (digits === "") {
      setPercentInput("0");
      setPageInput("0");
      return;
    }
    const raw = parseInt(digits, 10);
    const clamped = Math.min(raw, 100);
    setPercentInput(String(clamped));
    if (totalPages > 0) {
      setPageInput(String(Math.round((clamped / 100) * totalPages)));
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
          <input
            className="progress-modal__page-input progress-modal__page-input--percent"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={percentInput}
            onChange={handlePercentChange}
            onFocus={(e) => e.target.select()}
            disabled={totalPages === 0}
            aria-label={t("myLibrary.updateProgressModal.percentageLabel")}
          />
          <span className="progress-modal__page-total">%</span>
        </div>
        <div
          className="progress-modal__progress-track"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="progress-modal__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
