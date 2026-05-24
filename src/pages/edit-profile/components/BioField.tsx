import { useEffect } from "react";
import type { UseFormRegister } from "react-hook-form";

const BIO_MAX = 150;

type BioFieldProps = {
  register: UseFormRegister<{ bio: string } & Record<string, unknown>>;
  value: string;
  saveBlocked: boolean;
  onClearBlock: () => void;
  shaking: boolean;
  onShakeEnd: () => void;
};

export default function BioField({
  register,
  value,
  saveBlocked,
  onClearBlock,
  shaking,
  onShakeEnd,
}: BioFieldProps) {
  const overLimit = value.length > BIO_MAX;

  useEffect(() => {
    if (saveBlocked && !overLimit) onClearBlock();
  }, [value, saveBlocked, overLimit, onClearBlock]);

  return (
    <div className="edit-profile__field">
      <label className="edit-profile__label" htmlFor="bio">Biografía</label>
      <textarea
        id="bio"
        className={[
          "edit-profile__textarea",
          saveBlocked && overLimit ? "edit-profile__textarea--error" : "",
          shaking ? "edit-profile__textarea--shaking" : "",
        ].filter(Boolean).join(" ")}
        rows={4}
        onAnimationEnd={onShakeEnd}
        {...register("bio")}
      />
      <div className="edit-profile__bio-footer">
        {saveBlocked && overLimit && (
          <span className="edit-profile__bio-error">Demasiados caracteres</span>
        )}
        <span className={`edit-profile__bio-count${overLimit ? " edit-profile__bio-count--over" : ""}`}>
          {value.length} / {BIO_MAX} caracteres
        </span>
      </div>
    </div>
  );
}
