import { useTranslation } from "react-i18next";
import Modal from "@/components/common/Modal";
import "./SynopsisModal.scss";

type SynopsisModalProps = {
  text: string;
  onClose: () => void;
};

export default function SynopsisModal({ text, onClose }: SynopsisModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      title={t("bookDetail.synopsis")}
      ariaLabel={t("bookDetail.synopsisAriaLabel")}
      closeAriaLabel={t("bookDetail.close")}
      onClose={onClose}
      classNames={{
        root: "synopsis-modal",
        box: "synopsis-modal__box",
        header: "synopsis-modal__header",
        title: "synopsis-modal__title",
        close: "synopsis-modal__close",
      }}
    >
      <div className="synopsis-modal__body">
        {text.split("\n\n").map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </Modal>
  );
}
