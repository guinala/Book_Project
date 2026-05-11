# Book Rating Feature — Plan

**Fecha:** 2026-05-07  
**Feature:** Valoración y reseña de libros al terminar la lectura en `UpdateProgressModal`

---

## Archivos a modificar (8)

### 1. `src/types/UserProfile.ts`

Añadir `"book_rated"` a `ActivityType`:

```typescript
export type ActivityType =
  | "progress"
  | "review"
  | "list_created"
  | "watchlist_add"
  | "book_finished"
  | "reading_started"
  | "book_rated";          // ← nuevo
```

---

### 2. `src/services/firebase/firebaseLibrary.ts`

**Cambio A — tipo `ShelfEntry`:**

```typescript
export type ShelfEntry = {
  book: Book;
  status: ShelfStatus;
  currentPage?: number;
  rating?: number;   // 0.5 a 5, pasos de 0.5
  review?: string;   // reseña del usuario
};
```

**Cambio B — firma y cuerpo de `updateReadingProgress`:**

```typescript
export async function updateReadingProgress(
  uid: string,
  entry: ShelfEntry,
  currentPage: number,
  note?: string,
  rating?: number,   // ← nuevo
  review?: string    // ← nuevo
): Promise<void> {
  const totalPages = entry.book.pages ?? 0;
  const isFinished = totalPages > 0 && currentPage === totalPages;
  const shelfRef = doc(db, "Users", uid, "Shelf", encodeKey(entry.book.key));

  const update: Record<string, unknown> = { currentPage };
  if (isFinished) {
    update.status = "finished";
    if (rating !== undefined) update.rating = rating;
    if (review !== undefined) update.review = review;
  }
  await updateDoc(shelfRef, update);

  const base = {
    bookId: entry.book.key,
    bookTitle: entry.book.title,
    bookCoverUrl: entry.book.cover_url,
    bookAuthor: entry.book.authors[0],
  };

  logActivity(uid, { type: "progress", ...base, progress: currentPage, ...(note !== undefined && { note }) })
    .catch((err) => console.warn("[updateReadingProgress] logActivity failed:", err));

  if (isFinished) {
    logActivity(uid, { type: "book_finished", ...base })
      .catch((err) => console.warn("[updateReadingProgress] logActivity failed:", err));
    if (rating !== undefined) {
      logActivity(uid, { type: "book_rated", ...base, rating, ...(review !== undefined && { note: review }) })
        .catch((err) => console.warn("[updateReadingProgress] logActivity failed:", err));
    }
  }
}
```

**Cambio C — `getShelf`, dentro del `.map()`, añadir los dos campos al return:**

```typescript
// añadir después de currentPage
rating: data.rating ?? undefined,
review: data.review ?? undefined,
```

---

### 3. `src/context/shelf_init.ts`

Actualizar la firma de `updateProgress` en `ShelfContextType`:

```typescript
updateProgress: (
  bookKey: string,
  currentPage: number,
  note?: string,
  rating?: number,   // ← nuevo
  review?: string    // ← nuevo
) => Promise<void>;
```

---

### 4. `src/context/ShelfContext.tsx`

Reemplazar la función `updateProgress` (líneas 146–166):

```typescript
const updateProgress = async (
  bookKey: string,
  currentPage: number,
  note?: string,
  rating?: number,
  review?: string
) => {
  if (!uid) return;

  const encoded = encodeKey(bookKey);
  const existing = entries.get(encoded);
  if (!existing) return;

  const rollback = new Map(entries);
  const totalPages = existing.book.pages ?? 0;
  const newStatus: ShelfStatus =
    totalPages > 0 && currentPage === totalPages ? "finished" : existing.status;
  const newMap = new Map(entries);
  newMap.set(encoded, {
    ...existing,
    currentPage,
    status: newStatus,
    ...(rating !== undefined && { rating }),
    ...(review !== undefined && { review }),
  });
  setEntries(newMap);

  try {
    await updateReadingProgress(uid, existing, currentPage, note, rating, review);
  } catch {
    setEntries(rollback);
  }
};
```

---

### 5. `src/components/shelf/modals/UpdateProgressModal.tsx`

Archivo completo reescrito. Cambios principales respecto al original:

- **Import**: añadir `useId` al import de React.
- **Nuevo componente `StarSvg`**: SVG con `linearGradient` dinámico, acepta `fill: 0 | 0.5 | 1` y `uid: string`.
- **Nuevo componente `StarRating`**: 5 estrellas interactivas, estado `hover`, lógica de media estrella en `onMouseMove`.
- **Estado nuevo en `UpdateProgressModal`**: `rating`, `review`, `reviewSaveBlocked`, `reviewShaking`, `REVIEW_MAX = 600`.
- **Inicialización**: `rating` y `review` se precargan desde `entry.rating` y `entry.review` (por si el libro ya fue valorado).
- **`handleSave`**: bifurcado — si `finished`, pasa `rating` y `review`; si no, pasa `note`. Nunca se pasan los dos a la vez.
- **JSX**: el bloque de estrellas y el textarea de reseña aparecen condicionalmente cuando `finished === true`. El textarea de notas desaparece en ese momento.

```tsx
import { useId, useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useShelf } from "@/hooks/useShelf";
import type { ShelfEntry } from "@/services/firebase/firebaseLibrary";
import { getCoverUrl } from "@/utils/coverImage";
import { X } from "lucide-react";
import "./UpdateProgressModal.scss";

interface UpdateProgressModalProps {
  entry: ShelfEntry;
  onClose: () => void;
}

function StarSvg({ fill, uid }: { fill: 0 | 0.5 | 1; uid: string }) {
  const pct = fill === 1 ? "100%" : fill === 0.5 ? "50%" : "0%";
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
      <defs>
        <linearGradient id={uid}>
          <stop offset={pct} stopColor="var(--color-accent)" />
          <stop offset={pct} stopColor="var(--color-border-subtle)" />
        </linearGradient>
      </defs>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={`url(#${uid})`}
        stroke="var(--color-accent)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface StarRatingProps {
  rating: number;
  onChange: (v: number) => void;
}

function StarRating({ rating, onChange }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const gradBase = useId();
  const display = hover || rating;

  return (
    <div
      className="star-rating"
      onMouseLeave={() => setHover(0)}
      role="group"
      aria-label="Valoración"
    >
      {[1, 2, 3, 4, 5].map(star => {
        const fill: 0 | 0.5 | 1 =
          display >= star ? 1 : display >= star - 0.5 ? 0.5 : 0;
        return (
          <span
            key={star}
            className="star-rating__star"
            onMouseMove={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHover(
                (e.clientX - rect.left) / rect.width < 0.5 ? star - 0.5 : star
              );
            }}
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              onChange(
                (e.clientX - rect.left) / rect.width < 0.5 ? star - 0.5 : star
              );
            }}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") onChange(star);
            }}
            aria-label={`${star} estrellas`}
          >
            <StarSvg fill={fill} uid={`${gradBase}-${star}`} />
          </span>
        );
      })}
    </div>
  );
}

export default function UpdateProgressModal({ entry, onClose }: UpdateProgressModalProps) {
  const { t } = useTranslation();
  const { updateProgress, addBook } = useShelf();
  const panelRef = useRef<HTMLDivElement>(null);
  const prevPageRef = useRef(entry.currentPage ?? 0);
  const totalPages = entry.book.pages ?? 0;

  const [pageInput, setPageInput] = useState(
    entry.currentPage ? String(entry.currentPage) : ""
  );
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(entry.rating ?? 0);
  const [review, setReview] = useState(entry.review ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteSaveBlocked, setNoteSaveBlocked] = useState(false);
  const [noteShaking, setNoteShaking] = useState(false);
  const [reviewSaveBlocked, setReviewSaveBlocked] = useState(false);
  const [reviewShaking, setReviewShaking] = useState(false);

  const NOTE_MAX = 280;
  const REVIEW_MAX = 600;
  const noteOverLimit = note.length > NOTE_MAX;
  const reviewOverLimit = review.length > REVIEW_MAX;

  const currentPage = pageInput === ""
    ? 0
    : Math.max(0, Math.min(parseInt(pageInput, 10) || 0, totalPages));
  const finished = totalPages > 0 && currentPage === totalPages;
  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    const stripped = digits.replace(/^0+/, "");
    if (stripped === "") { setPageInput(""); return; }
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

  const handleSave = async () => {
    if (finished) {
      if (reviewOverLimit) {
        setReviewSaveBlocked(true);
        setReviewShaking(true);
        return;
      }
      setIsSubmitting(true);
      try {
        await updateProgress(
          entry.book.key,
          currentPage,
          undefined,
          rating || undefined,
          review.trim() || undefined
        );
      } finally {
        setIsSubmitting(false);
        onClose();
      }
    } else {
      if (noteOverLimit) {
        setNoteSaveBlocked(true);
        setNoteShaking(true);
        return;
      }
      setIsSubmitting(true);
      try {
        await updateProgress(entry.book.key, currentPage, note.trim() || undefined);
      } finally {
        setIsSubmitting(false);
        onClose();
      }
    }
  };

  const handleAbandon = async () => {
    await addBook(entry.book, "didNotFinish");
    onClose();
  };

  const coverSrc = entry.book.cover_url
    ?? (entry.book.cover_id ? getCoverUrl(entry.book.cover_id) : undefined);

  return createPortal(
    <div
      className="progress-modal"
      onMouseDown={handleBackdropMouseDown}
      role="dialog"
      aria-modal="true"
      aria-label={t("myLibrary.updateProgressModal.title")}
    >
      <div className="progress-modal__panel" ref={panelRef}>
        <div className="progress-modal__header">
          <h2 className="progress-modal__title">
            {t("myLibrary.updateProgressModal.title")}
          </h2>
          <button
            className="progress-modal__close"
            onClick={onClose}
            aria-label={t("myLibrary.updateProgressModal.close")}
          >
            <X />
          </button>
        </div>

        <div className="progress-modal__body">
          <div className="progress-modal__left">
            <div className="progress-modal__book-info">
              {coverSrc ? (
                <img className="progress-modal__cover" src={coverSrc} alt="" />
              ) : (
                <div className="progress-modal__cover progress-modal__cover--placeholder" />
              )}
              <p className="progress-modal__book-title">{entry.book.title}</p>
              <p className="progress-modal__book-author">
                {entry.book.authors.join(", ")}
              </p>
            </div>
            <button className="progress-modal__abandon-btn" onClick={handleAbandon}>
              {t("myLibrary.updateProgressModal.abandon")}
            </button>
          </div>

          <div className="progress-modal__divider" aria-hidden="true" />

          <div className="progress-modal__right">
            <div className="progress-modal__section">
              <div className="progress-modal__field">
                <label
                  className="progress-modal__label"
                  htmlFor="progress-page-input"
                >
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
                  <span className="progress-modal__progress-pct">
                    {progressPercent}%
                  </span>
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

              {finished && (
                <div className="progress-modal__rating-block">
                  <span className="progress-modal__label">
                    {t("myLibrary.updateProgressModal.rateBook")}
                  </span>
                  <div className="progress-modal__rating-row">
                    <StarRating rating={rating} onChange={setRating} />
                    {rating > 0 && (
                      <span className="progress-modal__rating-value">
                        {rating} / 5
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="progress-modal__section">
              {finished ? (
                <div className="progress-modal__field">
                  <label
                    className="progress-modal__label"
                    htmlFor="progress-review-input"
                  >
                    {t("myLibrary.updateProgressModal.review")}
                  </label>
                  <textarea
                    id="progress-review-input"
                    className={[
                      "progress-modal__textarea",
                      reviewSaveBlocked && reviewOverLimit
                        ? "progress-modal__textarea--error"
                        : "",
                      reviewShaking ? "progress-modal__textarea--shaking" : "",
                    ].filter(Boolean).join(" ")}
                    value={review}
                    onChange={(e) => {
                      setReview(e.target.value);
                      if (reviewSaveBlocked && e.target.value.length <= REVIEW_MAX)
                        setReviewSaveBlocked(false);
                    }}
                    onAnimationEnd={() => setReviewShaking(false)}
                    placeholder={t("myLibrary.updateProgressModal.reviewPlaceholder")}
                    rows={4}
                  />
                  <div className="progress-modal__note-footer">
                    {reviewSaveBlocked && reviewOverLimit && (
                      <span className="progress-modal__note-error">
                        {t("myLibrary.updateProgressModal.noteTooLong")}
                      </span>
                    )}
                    <span
                      className={`progress-modal__note-count${reviewOverLimit ? " progress-modal__note-count--over" : ""}`}
                    >
                      {review.length} / {REVIEW_MAX}{" "}
                      {t("myLibrary.updateProgressModal.characters")}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="progress-modal__field">
                  <label
                    className="progress-modal__label"
                    htmlFor="progress-note-input"
                  >
                    {t("myLibrary.updateProgressModal.notes")}
                  </label>
                  <textarea
                    id="progress-note-input"
                    className={[
                      "progress-modal__textarea",
                      noteSaveBlocked && noteOverLimit
                        ? "progress-modal__textarea--error"
                        : "",
                      noteShaking ? "progress-modal__textarea--shaking" : "",
                    ].filter(Boolean).join(" ")}
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      if (noteSaveBlocked && e.target.value.length <= NOTE_MAX)
                        setNoteSaveBlocked(false);
                    }}
                    onAnimationEnd={() => setNoteShaking(false)}
                    placeholder={t("myLibrary.updateProgressModal.notesPlaceholder")}
                    rows={3}
                  />
                  <div className="progress-modal__note-footer">
                    {noteSaveBlocked && noteOverLimit && (
                      <span className="progress-modal__note-error">
                        {t("myLibrary.updateProgressModal.noteTooLong")}
                      </span>
                    )}
                    <span
                      className={`progress-modal__note-count${noteOverLimit ? " progress-modal__note-count--over" : ""}`}
                    >
                      {note.length} / {NOTE_MAX}{" "}
                      {t("myLibrary.updateProgressModal.characters")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="progress-modal__footer">
          <button
            className="progress-modal__save-btn"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {t("myLibrary.updateProgressModal.save")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
```

---

### 6. `src/components/shelf/modals/UpdateProgressModal.scss`

**A — Nuevo `@keyframes` al principio del archivo (junto a los existentes):**

```scss
@keyframes rating-appear {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

**B — Nuevas reglas dentro del bloque `.progress-modal { }` (antes del cierre `}`):**

```scss
  &__rating-block {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-1);
    animation: rating-appear 200ms ease-out;
  }

  &__rating-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  &__rating-value {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }
```

**C — Nuevo bloque `.star-rating` fuera y después del cierre de `.progress-modal { }`:**

```scss
.star-rating {
  display: flex;
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

---

### 7. `src/plugins/i18n/locales/es/myLibrary.json`

Dentro de `updateProgressModal`, añadir las tres claves:

```json
"rateBook": "Valoración",
"review": "Reseña",
"reviewPlaceholder": "Cuéntanos qué te ha parecido el libro. ¿Lo recomendarías?"
```

---

### 8. `src/plugins/i18n/locales/en/myLibrary.json`

Dentro de `updateProgressModal`, añadir las tres claves:

```json
"rateBook": "Your rating",
"review": "Review",
"reviewPlaceholder": "Tell us what you thought of the book. Would you recommend it?"
```

---

## Lógica de datos

| Campo | Dónde se guarda | Tipo |
|---|---|---|
| `rating` | `Users/{uid}/Shelf/{bookId}` | `number` (0.5–5) |
| `review` | `Users/{uid}/Shelf/{bookId}` | `string` (max 600 chars) |
| Activity log | `Users/{uid}/activity/{id}` | type `"book_rated"`, campos `rating` + `note` (review) |

Solo se escriben en Firestore cuando `isFinished === true` (currentPage === totalPages).

## Flujo de UI

```
Toggle OFF  →  textarea de notas (280 chars)
Toggle ON   →  bloque de estrellas (aparece con animación)
            →  textarea de reseña (600 chars) en lugar de notas
```

Las estrellas usan `linearGradient` con punto de corte al 0% / 50% / 100%.  
La media estrella se detecta comparando `clientX` con el 50% del ancho del contenedor de la estrella.
