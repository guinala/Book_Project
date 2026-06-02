# Update Progress Modal Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar `UpdateProgressModal` con nuevo layout de 2 columnas, dropdown de estado local (sin persistencia hasta "Guardar"), sincronización bidireccional página/%, y vistas reactivas para "Leyendo" y "Acabado".

**Architecture:** El modal mantiene todo el estado local (`localStatus`, `pageInput`, `percentInput`, `note`, `rating`, `review`) sin tocar el backend hasta que el usuario pulsa "Guardar". Un nuevo componente `ModalStatusSelect` reemplaza al `ShelfStatusDropdown` embebido. La sincronización página↔% se realiza en los handlers de `ProgressPageInput` sin `useEffect`.

**Tech Stack:** React 19, TypeScript, SCSS con tokens CSS (`--color-*`, `--space-*`, etc.), i18next, Lucide React, Firebase (solo en save).

**Spec:** `docs/superpowers/specs/2026-06-01-update-progress-modal-redesign.md`

---

## File Map

| Acción | Archivo |
|--------|---------|
| Modificar | `src/plugins/i18n/locales/es/myLibrary.json` |
| Modificar | `src/plugins/i18n/locales/en/myLibrary.json` |
| Crear | `src/components/shelf/modals/components/ModalStatusSelect.tsx` |
| Crear | `src/components/shelf/modals/components/ModalStatusSelect.scss` |
| Modificar | `src/components/shelf/modals/components/ProgressPageInput.tsx` |
| Modificar | `src/components/shelf/modals/UpdateProgressModal.tsx` |
| Modificar | `src/components/shelf/modals/UpdateProgressModal.scss` |
| Eliminar | `src/components/shelf/modals/components/AbandonConfirmDialog.tsx` |

---

## Task 1: Actualizar claves i18n

**Files:**
- Modify: `src/plugins/i18n/locales/es/myLibrary.json`
- Modify: `src/plugins/i18n/locales/en/myLibrary.json`

- [ ] **Step 1: Reemplazar el bloque `updateProgressModal` en el JSON español**

En `src/plugins/i18n/locales/es/myLibrary.json`, localizar el bloque `"updateProgressModal"` y reemplazarlo por:

```json
"updateProgressModal": {
  "title": "Actualizar progreso",
  "currentPage": "Página actual",
  "of": "de",
  "note": "Nota",
  "notePlaceholder": "¿Qué te está pareciendo el libro? Cuéntale a todos qué piensas de la trama.",
  "save": "Guardar",
  "close": "Cerrar",
  "noteTooLong": "Has superado el máximo de caracteres",
  "characters": "caracteres",
  "rateBook": "Valoración",
  "review": "Reseña",
  "reviewPlaceholder": "¿Qué te ha parecido el libro? ¿Lo recomendarías?",
  "statusMessage": "Pulsa «Guardar» para mover el libro a esta estantería."
},
```

- [ ] **Step 2: Reemplazar el bloque `updateProgressModal` en el JSON inglés**

En `src/plugins/i18n/locales/en/myLibrary.json`, localizar el bloque `"updateProgressModal"` y reemplazarlo por:

```json
"updateProgressModal": {
  "title": "Update progress",
  "currentPage": "Current page",
  "of": "of",
  "note": "Note",
  "notePlaceholder": "What do you think of the book so far? Tell everyone about the plot.",
  "save": "Save",
  "close": "Close",
  "noteTooLong": "You've exceeded the maximum character limit",
  "characters": "characters",
  "rateBook": "Rating",
  "review": "Review",
  "reviewPlaceholder": "What did you think of the book? Would you recommend it?",
  "statusMessage": "Press 'Save' to move the book to this shelf."
},
```

- [ ] **Step 3: Verificar que el JSON sigue siendo válido**

```bash
node -e "require('./src/plugins/i18n/locales/es/myLibrary.json'); console.log('ES OK')"
node -e "require('./src/plugins/i18n/locales/en/myLibrary.json'); console.log('EN OK')"
```

Expected: `ES OK` y `EN OK` sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/plugins/i18n/locales/es/myLibrary.json src/plugins/i18n/locales/en/myLibrary.json
git commit -m "feat: actualiza claves i18n del modal de progreso"
```

---

## Task 2: Crear `ModalStatusSelect`

**Files:**
- Create: `src/components/shelf/modals/components/ModalStatusSelect.tsx`
- Create: `src/components/shelf/modals/components/ModalStatusSelect.scss`

- [ ] **Step 1: Crear `ModalStatusSelect.tsx`**

Crear el archivo `src/components/shelf/modals/components/ModalStatusSelect.tsx` con este contenido:

```tsx
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
  useClickOutsideMany([btnRef as React.RefObject<HTMLElement>, listRef as React.RefObject<HTMLElement>], close, open);

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
        className="modal-status-select__btn"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="modal-status-select__status">
          <Icon size={16} aria-hidden="true" />
          <span>{t(`myLibrary.shelf.${value}`)}</span>
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`modal-status-select__chevron${open ? " modal-status-select__chevron--open" : ""}`}
        />
      </button>

      {open &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
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
                <li key={opt} role="option" aria-selected={opt === value}>
                  <button
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
```

- [ ] **Step 2: Crear `ModalStatusSelect.scss`**

Crear el archivo `src/components/shelf/modals/components/ModalStatusSelect.scss` con este contenido:

```scss
@use "../../../../styles/shared" as *;

.modal-status-select {
  width: 100%;

  &__btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-sm);
    background: var(--color-bg-page);
    cursor: pointer;
    font-family: var(--font-main);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    transition: border-color var(--transition-fast);

    &:hover {
      border-color: var(--color-text-primary);
    }
  }

  &__status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  &__chevron {
    flex-shrink: 0;
    color: var(--color-text-secondary);
    transition: transform var(--transition-fast);

    &--open {
      transform: rotate(180deg);
    }
  }

  &__list {
    background: var(--color-bg-page);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-card-hover);
    list-style: none;
    margin: 0;
    padding: var(--space-1) 0;
    overflow: hidden;
  }

  &__option {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    cursor: pointer;
    font-family: var(--font-main);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--color-text-primary);
    text-align: left;
    transition: background var(--transition-fast);

    &:hover {
      background: var(--color-neutral-alpha-subtle);
    }

    &--active {
      font-weight: var(--weight-semibold);
      background: var(--color-neutral-alpha-muted);
    }
  }
}
```

- [ ] **Step 3: Verificar que TypeScript no da errores**

```bash
npm run build 2>&1 | grep -i "ModalStatusSelect\|error" | head -20
```

Expected: sin errores relacionados con `ModalStatusSelect`.

- [ ] **Step 4: Commit**

```bash
git add src/components/shelf/modals/components/ModalStatusSelect.tsx src/components/shelf/modals/components/ModalStatusSelect.scss
git commit -m "feat: crea ModalStatusSelect para dropdown de estado local en modal"
```

---

## Task 3: Refactorizar `ProgressPageInput`

**Files:**
- Modify: `src/components/shelf/modals/components/ProgressPageInput.tsx`

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

Reemplazar todo el contenido de `src/components/shelf/modals/components/ProgressPageInput.tsx` por:

```tsx
import { useTranslation } from "react-i18next";

type ProgressPageInputProps = {
  pageInput: string;
  setPageInput: (v: string) => void;
  percentInput: string;
  setPercentInput: (v: string) => void;
  totalPages: number;
  currentPage: number;
  progressPercent: number;
};

export default function ProgressPageInput({
  pageInput,
  setPageInput,
  percentInput,
  setPercentInput,
  totalPages,
  currentPage,
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
            aria-label="Porcentaje de lectura"
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
```

- [ ] **Step 2: Verificar que no hay errores de TypeScript en el archivo**

```bash
npm run build 2>&1 | grep "ProgressPageInput" | head -10
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/shelf/modals/components/ProgressPageInput.tsx
git commit -m "feat: añade input de porcentaje bidireccional a ProgressPageInput"
```

---

## Task 4: Refactorizar `UpdateProgressModal.tsx`

**Files:**
- Modify: `src/components/shelf/modals/UpdateProgressModal.tsx`

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

Reemplazar todo el contenido de `src/components/shelf/modals/UpdateProgressModal.tsx` por:

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useShelf } from "@/context/shelf/useShelf";
import type { ShelfEntry } from "@/services/firebase/firebaseLibrary";
import type { ShelfStatus } from "@/types/BookDetail";
import { resolveCoverSrc } from "@/utils/coverImage";
import "./UpdateProgressModal.scss";
import Modal from "@/components/common/Modal";
import EditableStarRating from "@/components/common/EditableStarRating";
import LimitedTextarea from "@/components/common/TextArea";
import ProgressPageInput from "./components/ProgressPageInput";
import ModalStatusSelect from "./components/ModalStatusSelect";

const NOTE_MAX = 280;
const REVIEW_MAX = 600;

type UpdateProgressModalProps = {
  entry: ShelfEntry;
  onClose: () => void;
};

const TEXTAREA_CLASSNAMES = {
  field: "progress-modal__field",
  label: "progress-modal__label",
  textarea: "progress-modal__textarea",
  footer: "progress-modal__note-footer",
  error: "progress-modal__note-error",
  count: "progress-modal__note-count",
};

function derivePercent(page: number, total: number): string {
  if (total === 0 || page === 0) return "0";
  return String(Math.round((page / total) * 100));
}

export default function UpdateProgressModal({ entry, onClose }: UpdateProgressModalProps) {
  const { t } = useTranslation();
  const { updateProgress, addBook } = useShelf();
  const totalPages = entry.book.pages ?? 0;

  const initialPage = entry.currentPage ?? 0;

  const [localStatus, setLocalStatus] = useState<ShelfStatus>(entry.status);
  const [pageInput, setPageInput] = useState(initialPage > 0 ? String(initialPage) : "");
  const [percentInput, setPercentInput] = useState(derivePercent(initialPage, totalPages));
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(entry.rating ?? 0);
  const [review, setReview] = useState(entry.review ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteSaveBlocked, setNoteSaveBlocked] = useState(false);
  const [noteShaking, setNoteShaking] = useState(false);
  const [reviewSaveBlocked, setReviewSaveBlocked] = useState(false);
  const [reviewShaking, setReviewShaking] = useState(false);

  const currentPage =
    pageInput === "" ? 0 : Math.max(0, Math.min(parseInt(pageInput, 10) || 0, totalPages));
  const progressPercent =
    totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  const handleSave = async () => {
    if (localStatus === "wantToRead" || localStatus === "didNotFinish") {
      setIsSubmitting(true);
      try {
        await addBook(entry.book, localStatus);
      } finally {
        setIsSubmitting(false);
        onClose();
      }
      return;
    }

    if (localStatus === "finished") {
      if (review.length > REVIEW_MAX) {
        setReviewSaveBlocked(true);
        setReviewShaking(true);
        return;
      }
      setIsSubmitting(true);
      const savePage = totalPages > 0 ? totalPages : currentPage;
      try {
        await updateProgress(entry.book.key, savePage, {
          rating: rating || undefined,
          review: review.trim() || undefined,
          status: "finished",
        });
      } finally {
        setIsSubmitting(false);
        onClose();
      }
      return;
    }

    // localStatus === "reading"
    if (note.length > NOTE_MAX) {
      setNoteSaveBlocked(true);
      setNoteShaking(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await updateProgress(entry.book.key, currentPage, {
        note: note.trim() || undefined,
        status: "reading",
      });
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const coverSrc = resolveCoverSrc(entry.book);

  return (
    <Modal
      title={t("myLibrary.updateProgressModal.title")}
      ariaLabel={t("myLibrary.updateProgressModal.title")}
      closeAriaLabel={t("myLibrary.updateProgressModal.close")}
      onClose={onClose}
      usePortal
      classNames={{
        root: "progress-modal",
        box: "progress-modal__panel",
        header: "progress-modal__header",
        title: "progress-modal__title",
        close: "progress-modal__close",
      }}
    >
      <div className="progress-modal__body">
        <div className="progress-modal__left">
          <ModalStatusSelect value={localStatus} onChange={setLocalStatus} />
          {coverSrc ? (
            <img className="progress-modal__cover" src={coverSrc} alt="" />
          ) : (
            <div className="progress-modal__cover progress-modal__cover--placeholder" />
          )}
        </div>

        <div className="progress-modal__divider" aria-hidden="true" />

        <div className="progress-modal__right">
          {localStatus === "reading" && (
            <>
              <ProgressPageInput
                pageInput={pageInput}
                setPageInput={setPageInput}
                percentInput={percentInput}
                setPercentInput={setPercentInput}
                totalPages={totalPages}
                currentPage={currentPage}
                progressPercent={progressPercent}
              />
              <div className="progress-modal__section">
                <LimitedTextarea
                  id="progress-note-input"
                  label={t("myLibrary.updateProgressModal.note")}
                  placeholder={t("myLibrary.updateProgressModal.notePlaceholder")}
                  value={note}
                  onChange={setNote}
                  max={NOTE_MAX}
                  hardLimit
                  rows={4}
                  saveBlocked={noteSaveBlocked}
                  onClearBlock={() => setNoteSaveBlocked(false)}
                  shaking={noteShaking}
                  onShakeEnd={() => setNoteShaking(false)}
                  errorText={t("myLibrary.updateProgressModal.noteTooLong")}
                  charactersText={t("myLibrary.updateProgressModal.characters")}
                  classNames={TEXTAREA_CLASSNAMES}
                />
              </div>
            </>
          )}

          {localStatus === "finished" && (
            <>
              <div className="progress-modal__section">
                <div className="progress-modal__rating-block">
                  <span className="progress-modal__label">
                    {t("myLibrary.updateProgressModal.rateBook")}
                  </span>
                  <div className="progress-modal__rating-row">
                    <EditableStarRating rating={rating} onChange={setRating} />
                    <span className="progress-modal__rating-value">{rating}/5</span>
                  </div>
                </div>
              </div>
              <div className="progress-modal__section">
                <LimitedTextarea
                  id="progress-review-input"
                  label={t("myLibrary.updateProgressModal.review")}
                  placeholder={t("myLibrary.updateProgressModal.reviewPlaceholder")}
                  value={review}
                  onChange={setReview}
                  max={REVIEW_MAX}
                  rows={5}
                  saveBlocked={reviewSaveBlocked}
                  onClearBlock={() => setReviewSaveBlocked(false)}
                  shaking={reviewShaking}
                  onShakeEnd={() => setReviewShaking(false)}
                  errorText={t("myLibrary.updateProgressModal.noteTooLong")}
                  charactersText={t("myLibrary.updateProgressModal.characters")}
                  classNames={TEXTAREA_CLASSNAMES}
                />
              </div>
            </>
          )}

          {(localStatus === "wantToRead" || localStatus === "didNotFinish") && (
            <div className="progress-modal__status-message">
              <p>{t("myLibrary.updateProgressModal.statusMessage")}</p>
            </div>
          )}
        </div>
      </div>

      <div className="progress-modal__footer">
        <button
          type="button"
          className="progress-modal__save-btn"
          onClick={handleSave}
          disabled={isSubmitting}
        >
          {t("myLibrary.updateProgressModal.save")}
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Verificar que TypeScript compila**

```bash
npm run build 2>&1 | grep -E "error TS|UpdateProgressModal" | head -20
```

Expected: sin errores relacionados con `UpdateProgressModal`.

- [ ] **Step 3: Commit**

```bash
git add src/components/shelf/modals/UpdateProgressModal.tsx
git commit -m "feat: refactoriza UpdateProgressModal con nuevo layout y lógica de estado local"
```

---

## Task 5: Actualizar `UpdateProgressModal.scss`

**Files:**
- Modify: `src/components/shelf/modals/UpdateProgressModal.scss`

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

Reemplazar todo el contenido de `src/components/shelf/modals/UpdateProgressModal.scss` por:

```scss
@use "../../../styles/shared" as *;

@keyframes progress-flow {
  from { background-position: 0% 0; }
  to   { background-position: -200% 0; }
}

@keyframes rating-appear {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes progress-modal-shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
}

.progress-modal {
  @include modal-backdrop;

  &__panel {
    @include modal-panel(780px);
    background: var(--color-bg-page);
    position: relative;
  }

  &__header {
    @include modal-header;
  }

  &__title {
    @include modal-title;
  }

  &__close {
    @include modal-close;
  }

  &__body {
    @include modal-body;
  }

  &__left {
    @include modal-left;
    width: 240px;
    min-width: 200px;
    max-width: 260px;
    gap: var(--space-3);
  }

  &__cover {
    width: 100%;
    height: auto;
    aspect-ratio: 110 / 162;
    border-radius: var(--radius-lg);
    object-fit: cover;
    box-shadow: var(--shadow-cover);
    flex-shrink: 0;

    &--placeholder {
      background: var(--color-bg-section);
    }
  }

  &__divider {
    @include modal-divider;
  }

  &__right {
    @include modal-right;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-5) 0;

    &:first-child {
      padding-top: 0;
    }

    & + & {
      border-top: 1px solid var(--color-border-subtle);
    }

    &:last-child {
      padding-bottom: 0;
    }
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__label {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
  }

  &__page-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
  }

  &__page-input {
    width: 52px;
    padding: 6px var(--space-2);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    background: var(--color-bg-page);
    text-align: center;
    transition: border-color var(--transition-fast);

    &:hover {
      border-color: var(--color-text-primary);
    }

    &:focus {
      outline: none;
      border-color: var(--color-text-primary);
    }

    &--percent {
      margin-left: auto;

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  }

  &__page-total {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  &__progress-track {
    height: 28px;
    border-radius: var(--radius-pill);
    overflow: hidden;
    background: var(--color-border-card);
    border: 1px solid var(--color-border-medium);
  }

  &__progress-fill {
    height: 100%;
    background: linear-gradient(
      90deg,
      #ffbc9c 0%,
      #f7a178 30%,
      #f08755 60%,
      #e86b30 100%
    );
    background-size: 200% 100%;
    background-repeat: repeat-x;
    animation: progress-flow 8s linear infinite;
    transition: width 300ms ease-out;
    border-radius: var(--radius-pill);
  }

  &__textarea {
    resize: vertical;
    min-height: 90px;
    padding: var(--space-3);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    color: var(--color-text-primary);
    background: var(--color-bg-page);
    font-family: var(--font-main);
    line-height: 1.5;
    transition: border-color var(--transition-fast);

    &::placeholder {
      color: var(--color-text-tertiary);
      font-style: italic;
    }

    &:focus {
      outline: none;
      border-color: var(--color-text-primary);
    }

    &--disabled {
      opacity: 0.4;
      cursor: not-allowed;
      resize: none;
    }

    &--error {
      border-color: var(--color-error);
    }

    &--shaking {
      animation: progress-modal-shake 400ms ease;
    }
  }

  &__note-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-3);
    margin-top: var(--space-1);
  }

  &__note-error {
    font-size: var(--text-xs);
    color: var(--color-error);
  }

  &__note-count {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);

    &--over {
      color: var(--color-error);
    }
  }

  &__footer {
    @include modal-footer;
    justify-content: flex-end;
  }

  &__rating-block {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    animation: rating-appear 200ms ease-out;
  }

  &__rating-row {
    display: flex;
    align-items: center;
    gap: var(--space-4);

    svg {
      width: 40px !important;
      height: 40px !important;
    }
  }

  &__rating-value {
    font-size: var(--text-md);
    font-weight: var(--weight-semibold);
    color: var(--color-text-secondary);
  }

  &__status-message {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);

    p {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
      text-align: center;
      font-style: italic;
    }
  }

  &__save-btn {
    background: var(--color-btn-primary-bg);
    color: var(--color-btn-primary-fg);
    border: none;
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-5);
    font-family: var(--font-main);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    cursor: pointer;
    transition: background var(--transition-fast);

    &:hover:not(:disabled) {
      background: var(--color-btn-primary-hover);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}

.star-rating {
  display: flex;
  align-items: center;
  gap: var(--space-1);

  &__star {
    cursor: pointer;
    display: flex;
    align-items: center;
    user-select: none;
    border-radius: 2px;

    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }
  }
}
```

- [ ] **Step 2: Verificar que el build no tiene errores SCSS**

```bash
npm run build 2>&1 | grep -i "sass\|scss\|error" | head -20
```

Expected: sin errores de SCSS.

- [ ] **Step 3: Commit**

```bash
git add src/components/shelf/modals/UpdateProgressModal.scss
git commit -m "feat: actualiza estilos del modal de progreso con nuevo layout y barra de progreso"
```

---

## Task 6: Eliminar `AbandonConfirmDialog`

**Files:**
- Delete: `src/components/shelf/modals/components/AbandonConfirmDialog.tsx`

- [ ] **Step 1: Eliminar el archivo**

```bash
rm src/components/shelf/modals/components/AbandonConfirmDialog.tsx
```

- [ ] **Step 2: Verificar que el build compila sin referencias rotas**

```bash
npm run build 2>&1 | grep -i "AbandonConfirmDialog\|error TS" | head -20
```

Expected: sin errores. Si aparece alguno, significa que hay una importación olvidada — buscar con:

```bash
grep -rn "AbandonConfirmDialog" src/
```

y eliminar la línea encontrada.

- [ ] **Step 3: Commit**

```bash
git add -u
git commit -m "chore: elimina AbandonConfirmDialog (reemplazado por dropdown de estado local)"
```

---

## Task 7: Verificación final — lint, build y visual

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Ejecutar lint**

```bash
npm run lint 2>&1 | tail -20
```

Expected: sin errores de ESLint. Los warnings de `button-has-type` pre-existentes son aceptables si ya estaban antes de este trabajo.

- [ ] **Step 2: Ejecutar build completo**

```bash
npm run build 2>&1 | tail -30
```

Expected: `✓ built in Xs` sin errores.

- [ ] **Step 3: Iniciar dev server y verificar visualmente**

```bash
npm run dev
```

Verificar en el navegador:

1. Abrir la página "Mi biblioteca" → sección "Leyendo actualmente"
2. Hacer clic en "Actualizar progreso" → debe abrirse el nuevo modal
3. **Vista Leyendo:** comprobar que aparece el dropdown de estado, la portada grande, el input de página y el input de % sincronizados, la barra de progreso de 28px, y el campo "Nota"
4. **Sincronización bidireccional:** escribir "100" en el input de página → el % debe actualizarse; escribir "50" en el input de % → la página debe actualizarse
5. **Cambio a "Acabado":** seleccionar "Acabado" en el dropdown → el panel derecho debe cambiar a valoración + reseña con estrellas grandes
6. **Cambio a "Quiero leer":** seleccionar "Quiero leer" → debe aparecer el mensaje de estado
7. **Guardar:** pulsar "Guardar" en cualquier estado → debe persistir y cerrar el modal
8. **Dark mode:** activar tema oscuro y verificar que los tokens de color se aplican correctamente

- [ ] **Step 4: Commit final si hay ajustes menores de estilo**

```bash
git add -p   # añadir solo los ajustes de estilo
git commit -m "fix: ajustes visuales tras verificación del modal de progreso"
```
