import { bem } from "@/utils/className";

type LimitedTextareaProps = {
  id: string;
  label: string;
  placeholder?: string;
  rows?: number;
  value: string;
  onChange: (v: string) => void;
  max: number;
  hardLimit?: boolean;      
  disabled?: boolean;
  saveBlocked: boolean;
  onClearBlock: () => void;
  shaking: boolean;
  onShakeEnd: () => void;
  errorText: string;
  charactersText: string;
  classNames?: Partial<{
    field: string;
    label: string;
    textarea: string;          
    footer: string;
    error: string;
    count: string;             
  }>;
};

export default function LimitedTextarea({
  id, label, placeholder, rows = 4,
  value, onChange, max, hardLimit, disabled,
  saveBlocked, onClearBlock, shaking, onShakeEnd,
  errorText, charactersText,
  classNames,
}: LimitedTextareaProps) {
  const overLimit = value.length > max;

  return (
    <div className={classNames?.field}>
      <label className={classNames?.label} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className={bem(classNames?.textarea, {
          disabled: !!disabled,
          error: saveBlocked && overLimit,
          shaking,
        })}
        value={value}
        maxLength={hardLimit ? max : undefined}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          if (saveBlocked && e.target.value.length <= max) onClearBlock();
        }}
        onAnimationEnd={onShakeEnd}
        placeholder={placeholder}
        rows={rows}
      />
      <div className={classNames?.footer}>
        {saveBlocked && overLimit && (
          <span className={classNames?.error}>{errorText}</span>
        )}
        <span className={bem(classNames?.count, { over: overLimit })}>
          {value.length} / {max} {charactersText}
        </span>
      </div>
    </div>
  );
}
