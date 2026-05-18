# Update Progress Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Actualizar progreso" button in `CurrentReadingCard` open a functional modal that persists reading progress to Firestore, logs activity with an optional note, and handles abandoning a book.

**Architecture:** Extend `ShelfEntry` with `currentPage`, add `updateReadingProgress` to the Firebase service layer, wire a new `updateProgress` method into `ShelfContext`, then build the `UpdateProgressModal` component and connect `CurrentReadingCard` to real data.

**Tech Stack:** React 19, TypeScript, SCSS (BEM), Firebase Firestore (`updateDoc`), i18next, `createPortal`

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/services/firebase/firebase_library.ts` |
| Modify | `src/services/firebase/firebase_activity.ts` |
| Modify | `src/types/UserProfile.ts` |
| Modify | `src/context/shelf_init.ts` |
| Modify | `src/context/ShelfContext.tsx` |
| Modify | `src/plugins/i18n/locales/es/myLibrary.json` |
| Modify | `src/plugins/i18n/locales/en/myLibrary.json` |
| Create | `src/components/UpdateProgressModal/UpdateProgressModal.tsx` |
| Create | `src/components/UpdateProgressModal/UpdateProgressModal.scss` |
| Modify | `src/components/CurrentReadingCard/CurrentReadingCard.tsx` |
| Modify | `src/components/ActivityItem/ActivityItem.tsx` |
| Modify | `src/components/ActivityItem/ActivityItem.scss` |

---

## Task 1: Extend types

**Files:**
- Modify: `src/services/firebase/firebase_library.ts` (line 7)
- Modify: `src/types/UserProfile.ts` (line 40–49)

- [ ] **Step 1: Add `currentPage` to `ShelfEntry`**

In `src/services/firebase/firebase_library.ts`, change line 7:

```typescript
export type ShelfEntry = { book: Book; status: ShelfStatus; currentPage?: number };
```

- [ ] **Step 2: Add `note` to `ActivityEvent`**

In `src/types/UserProfile.ts`, change the `ActivityEvent` type (lines 40–49):

```typescript
export type ActivityEvent = {
  type: ActivityType;
  bookId?: string;
  bookTitle?: string;
  bookCoverUrl?: string;
  bookAuthor?: string;
  rating?: number;
  progress?: number;
  listName?: string;
  note?: string;
};
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/firebase/firebase_library.ts src/types/UserProfile.ts
git commit -m "feat(progress): extend ShelfEntry and ActivityEvent types"
```

---

## Task 2: Update Firebase service layer

**Files:**
- Modify: `src/services/firebase/firebase_library.ts`
- Modify: `src/services/firebase/firebase_activity.ts`

- [ ] **Step 1: Add `updateDoc` import and `updateReadingProgress` function**

In `src/services/firebase/firebase_library.ts`, replace the import line and add the new function. The full file after changes:

```typescript
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase_init";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { logActivity } from "./firebase_activity";

export type ShelfEntry = { book: Book; status: ShelfStatus; currentPage?: number };

export function encodeKey(bookKey: string): string {
  return bookKey.split("/").at(-1) ?? bookKey;
}

export async function addToShelf(
  uid: string,
  book: Book,
  status: ShelfStatus,
  prevStatus?: ShelfStatus | null
): Promise<void> {
  const shelfRef = doc(db, "Users", uid, "Shelf", encodeKey(book.key));
  await setDoc(shelfRef, {
    ...book,
    status,
    addedAt: new Date().toISOString(),
  }, { merge: true });

  if (prevStatus === status) return;

  const base = {
    bookId: book.key,
    bookTitle: book.title,
    bookCoverUrl: book.cover_url,
    bookAuthor: book.authors[0],
  };

  if (status === "wantToRead") {
    logActivity(uid, { type: "watchlist_add", ...base })
      .catch((err) => console.warn("[addToShelf] logActivity failed:", err));
  } else if (status === "reading") {
    logActivity(uid, { type: "reading_started", ...base })
      .catch((err) => console.warn("[addToShelf] logActivity failed:", err));
  } else if (status === "finished") {
    logActivity(uid, { type: "book_finished", ...base })
      .catch((err) => console.warn("[addToShelf] logActivity failed:", err));
  }
}

export async function updateReadingProgress(
  uid: string,
  entry: ShelfEntry,
  currentPage: number,
  note?: string
): Promise<void> {
  const totalPages = entry.book.pages ?? 0;
  const isFinished = totalPages > 0 && currentPage === totalPages;
  const shelfRef = doc(db, "Users", uid, "Shelf", encodeKey(entry.book.key));

  const update: Record<string, unknown> = { currentPage };
  if (isFinished) update.status = "finished";
  await updateDoc(shelfRef, update);

  const base = {
    bookId: entry.book.key,
    bookTitle: entry.book.title,
    bookCoverUrl: entry.book.cover_url,
    bookAuthor: entry.book.authors[0],
  };

  logActivity(uid, { type: "progress", ...base, progress: currentPage, note })
    .catch((err) => console.warn("[updateReadingProgress] logActivity failed:", err));

  if (isFinished) {
    logActivity(uid, { type: "book_finished", ...base })
      .catch((err) => console.warn("[updateReadingProgress] logActivity failed:", err));
  }
}

export async function removeFromShelf(
    uid: string,
    bookKey: string): Promise<void> {
    await deleteDoc(doc(db, "Users", uid, "Shelf", encodeKey(bookKey)));
}

export async function getShelf(uid: string): Promise<ShelfEntry[] | null> {
   const shelf = await getDocs(collection(db, "Users", uid, "Shelf"));

    if (shelf.size <= 0) {
        return null;
    }

    return shelf.docs.map((d) => {
        const data = d.data();
        return {
            book: {
                key: data.key,
                title: data.title,
                authors: data.authors,
                authorKeys: data.authorKeys ?? undefined,
                first_publish_year: data.first_publish_year,
                cover_id: data.cover_id,
                cover_url: data.cover_url ?? undefined,
                edition_count: data.edition_count,
                genre: data.genre ?? undefined,
                rating: data.rating ?? undefined,
                ratingCount: data.ratingCount ?? undefined,
                isbn: data.isbn ?? undefined,
                pages: data.pages ?? undefined,
            } as Book,
            status: data.status as ShelfStatus,
            currentPage: data.currentPage ?? undefined,
        };
    });
}

export async function getBookStatus(
    uid: string,
    bookKey: string): Promise<ShelfStatus | null> {
    const bookDoc = await getDoc(doc(db, "Users", uid, "Shelf", encodeKey(bookKey)));

    if (!bookDoc.exists()) return null;
    return (bookDoc.data().status as ShelfStatus) ?? null;
}
```

- [ ] **Step 2: Map `note` in `getActivity`**

In `src/services/firebase/firebase_activity.ts`, add `note: data.note,` to the returned object in `getActivity`. The full updated `getActivity` function:

```typescript
export async function getActivity(
  uid: string,
  maxResults = 10
): Promise<ActivityItem[]> {
  const q = query(
    collection(db, "Users", uid, "activity"),
    orderBy("createdAt", "desc"),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: data.type as ActivityItem["type"],
      createdAt: data.createdAt as Timestamp,
      bookId: data.bookId,
      bookTitle: data.bookTitle,
      bookCoverUrl: data.bookCoverUrl,
      bookAuthor: data.bookAuthor,
      rating: data.rating,
      progress: data.progress,
      listName: data.listName,
      note: data.note,
    };
  });
}
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/firebase/firebase_library.ts src/services/firebase/firebase_activity.ts
git commit -m "feat(progress): add updateReadingProgress service and note mapping"
```

---

## Task 3: Add i18n keys

**Files:**
- Modify: `src/plugins/i18n/locales/es/myLibrary.json`
- Modify: `src/plugins/i18n/locales/en/myLibrary.json`

- [ ] **Step 1: Add Spanish keys**

Inside the `"myLibrary"` object in `src/plugins/i18n/locales/es/myLibrary.json`, add after the `"updateProgress"` key:

```json
"updateProgressModal": {
  "title": "Actualizar progreso",
  "currentPage": "Página actual",
  "of": "de",
  "finished": "¿Has terminado el libro?",
  "notes": "Notas",
  "notesPlaceholder": "¿Qué te ha parecido esta última lectura? ¿Alguna cita destacable?",
  "abandon": "Marcar como dejado",
  "save": "Guardar lectura",
  "close": "Cerrar"
},
```

- [ ] **Step 2: Add English keys**

Inside the `"myLibrary"` object in `src/plugins/i18n/locales/en/myLibrary.json`, add after the `"updateProgress"` key:

```json
"updateProgressModal": {
  "title": "Update progress",
  "currentPage": "Current page",
  "of": "of",
  "finished": "Have you finished the book?",
  "notes": "Notes",
  "notesPlaceholder": "How did you find this reading session? Any notable quotes?",
  "abandon": "Mark as abandoned",
  "save": "Save reading",
  "close": "Close"
},
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/plugins/i18n/locales/es/myLibrary.json src/plugins/i18n/locales/en/myLibrary.json
git commit -m "feat(progress): add i18n keys for update progress modal"
```

---

## Task 4: Extend ShelfContext

**Files:**
- Modify: `src/context/shelf_init.ts`
- Modify: `src/context/ShelfContext.tsx`

- [ ] **Step 1: Add `getEntry` and `updateProgress` to `ShelfContextType`**

Replace the full content of `src/context/shelf_init.ts`:

```typescript
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import type { ShelfEntry } from "@/services/firebase/firebase_library";
import { createContext } from "react";

export type ShelfContextType = {
  shelfByStatus: Record<ShelfStatus, Book[]>;
  loading: boolean;
  addBook: (book: Book, status: ShelfStatus) => Promise<void>;
  removeBook: (bookKey: string) => Promise<void>;
  getStatus: (bookKey: string) => ShelfStatus | null;
  getEntry: (bookKey: string) => ShelfEntry | null;
  updateProgress: (bookKey: string, currentPage: number, note?: string) => Promise<void>;
}

export const ShelfContext = createContext<ShelfContextType | null>(null);
```

- [ ] **Step 2: Implement `getEntry` and `updateProgress` in `ShelfContext.tsx`**

Replace the full content of `src/context/ShelfContext.tsx`:

```typescript
import { auth } from "@/services/firebase/firebase_init";
import { addToShelf, encodeKey, getShelf, removeFromShelf, updateReadingProgress, type ShelfEntry } from "@/services/firebase/firebase_library";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { ShelfContext } from "./shelf_init";

export function ShelfProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Map<string, ShelfEntry>>(new Map());
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    let generation = 0;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const uid = firebaseUser?.uid;
      const myGen = ++generation;

      if (uid) {
        setUid(uid);
        setLoading(true);
        try {
          const shelf = await getShelf(uid);
          if (myGen !== generation) return;
          const shelfMap = new Map(
            (shelf ?? []).map(e => [encodeKey(e.book.key), e])
          );
          setEntries(shelfMap);
        } catch {
          if (myGen !== generation) return;
        } finally {
          if (myGen === generation) setLoading(false);
        }
      } else {
        setUid(null);
        setEntries(new Map());
      }
    });

    return () => unsubscribe();
  }, []);

  const addBook = async (book: Book, status: ShelfStatus) => {
    if (!uid) return;

    const prevStatus = entries.get(encodeKey(book.key))?.status ?? null;
    const rollback = new Map(entries);
    const newMap = new Map(entries);
    newMap.set(encodeKey(book.key), { book, status });
    setEntries(newMap);

    try {
      await addToShelf(uid, book, status, prevStatus);
    } catch {
      setEntries(rollback);
    }
  };

  const removeBook = async (bookKey: string) => {
    if (!uid) return;

    const rollback = new Map(entries);
    const newMap = new Map(entries);
    newMap.delete(encodeKey(bookKey));
    setEntries(newMap);

    try {
      await removeFromShelf(uid, bookKey);
    } catch {
      setEntries(rollback);
    }
  };

  const getStatus = (bookKey: string) => entries.get(encodeKey(bookKey))?.status ?? null;

  const getEntry = (bookKey: string): ShelfEntry | null =>
    entries.get(encodeKey(bookKey)) ?? null;

  const updateProgress = async (bookKey: string, currentPage: number, note?: string) => {
    if (!uid) return;

    const encoded = encodeKey(bookKey);
    const existing = entries.get(encoded);
    if (!existing) return;

    const rollback = new Map(entries);
    const totalPages = existing.book.pages ?? 0;
    const newStatus: ShelfStatus =
      totalPages > 0 && currentPage === totalPages ? "finished" : existing.status;
    const newMap = new Map(entries);
    newMap.set(encoded, { ...existing, currentPage, status: newStatus });
    setEntries(newMap);

    try {
      await updateReadingProgress(uid, existing, currentPage, note);
    } catch {
      setEntries(rollback);
    }
  };

  const shelfByStatus = useMemo(() => {
    const result: Record<ShelfStatus, Book[]> = {
      wantToRead: [], reading: [], finished: [], didNotFinish: [],
    };
    for (const { book, status } of entries.values()) {
      result[status].push(book);
    }
    return result;
  }, [entries]);

  return (
    <ShelfContext.Provider
      value={{ shelfByStatus, loading, addBook, removeBook, getStatus, getEntry, updateProgress }}
    >
      {children}
    </ShelfContext.Provider>
  );
}
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/context/shelf_init.ts src/context/ShelfContext.tsx
git commit -m "feat(progress): add getEntry and updateProgress to ShelfContext"
```

---

## Task 5: Create UpdateProgressModal component

**Files:**
- Create: `src/components/UpdateProgressModal/UpdateProgressModal.tsx`
- Create: `src/components/UpdateProgressModal/UpdateProgressModal.scss`

- [ ] **Step 1: Create `UpdateProgressModal.tsx`**

```typescript
import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useShelf } from "@/hooks/useShelf";
import type { ShelfEntry } from "@/services/firebase/firebase_library";
import { getCoverUrl } from "@/utils/coverImage";
import "./UpdateProgressModal.scss";

interface UpdateProgressModalProps {
  entry: ShelfEntry;
  onClose: () => void;
}

export default function UpdateProgressModal({ entry, onClose }: UpdateProgressModalProps) {
  const { t } = useTranslation();
  const { updateProgress, addBook } = useShelf();
  const panelRef = useRef<HTMLDivElement>(null);
  const totalPages = entry.book.pages ?? 0;

  const [currentPage, setCurrentPage] = useState(entry.currentPage ?? 0);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const val = Math.max(0, Math.min(Number(e.target.value), totalPages));
    setCurrentPage(val);
  };

  const handleToggleFinished = () => {
    setCurrentPage(finished ? currentPage : totalPages);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateProgress(entry.book.key, currentPage, note.trim() || undefined);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const handleAbandon = async () => {
    await addBook(entry.book, "didNotFinish");
    onClose();
  };

  const coverSrc = entry.book.cover_url ?? (entry.book.cover_id ? getCoverUrl(entry.book.cover_id) : undefined);

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
          <h2 className="progress-modal__title">{t("myLibrary.updateProgressModal.title")}</h2>
          <button
            className="progress-modal__close"
            onClick={onClose}
            aria-label={t("myLibrary.updateProgressModal.close")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="progress-modal__body">
          <div className="progress-modal__left">
            {coverSrc ? (
              <img className="progress-modal__cover" src={coverSrc} alt="" />
            ) : (
              <div className="progress-modal__cover progress-modal__cover--placeholder" />
            )}
            <p className="progress-modal__book-title">{entry.book.title}</p>
            <p className="progress-modal__book-author">{entry.book.authors.join(", ")}</p>
            <button className="progress-modal__abandon-btn" onClick={handleAbandon}>
              {t("myLibrary.updateProgressModal.abandon")}
            </button>
          </div>

          <div className="progress-modal__divider" aria-hidden="true" />

          <div className="progress-modal__right">
            <div className="progress-modal__field">
              <label className="progress-modal__label" htmlFor="progress-page-input">
                {t("myLibrary.updateProgressModal.currentPage")}
              </label>
              <div className="progress-modal__page-row">
                <input
                  id="progress-page-input"
                  className="progress-modal__page-input"
                  type="number"
                  min={0}
                  max={totalPages || undefined}
                  value={currentPage}
                  onChange={handlePageChange}
                />
                {totalPages > 0 && (
                  <span className="progress-modal__page-total">
                    {t("myLibrary.updateProgressModal.of")} {totalPages}
                  </span>
                )}
              </div>
            </div>

            <div className="progress-modal__field">
              <div className="progress-modal__progress-track">
                <div
                  className="progress-modal__progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="progress-modal__progress-pct">{progressPercent}%</span>
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

            <div className="progress-modal__field">
              <label className="progress-modal__label" htmlFor="progress-note-input">
                {t("myLibrary.updateProgressModal.notes")}
              </label>
              <textarea
                id="progress-note-input"
                className="progress-modal__textarea"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("myLibrary.updateProgressModal.notesPlaceholder")}
                rows={3}
              />
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

- [ ] **Step 2: Create `UpdateProgressModal.scss`**

```scss
@use "../../styles/shared" as *;

@keyframes progress-modal-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes progress-modal-slide-up {
  from { transform: translateY(14px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.progress-modal {
  position: fixed;
  inset: 0;
  background: rgba(44, 36, 32, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  animation: progress-modal-fade-in 180ms ease;

  &__panel {
    background: var(--color-bg-card-solid);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-modal);
    width: 100%;
    max-width: 760px;
    display: flex;
    flex-direction: column;
    animation: progress-modal-slide-up 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px var(--space-4);
    border-bottom: 1px solid var(--color-border-subtle);
    flex-shrink: 0;
  }

  &__title {
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    letter-spacing: -0.01em;
    margin: 0;
  }

  &__close {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--color-border-subtle);
    background: transparent;
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      color var(--transition-fast),
      border-color var(--transition-fast);

    svg {
      width: 14px;
      height: 14px;
    }

    &:hover {
      border-color: var(--color-accent);
      color: var(--color-accent);
      background: var(--color-brand-alpha-subtle);
    }
  }

  &__body {
    display: flex;
    gap: 0;
    padding: var(--space-6);
    min-height: 0;
  }

  &__left {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    min-width: 148px;
    padding-right: var(--space-6);
    flex-shrink: 0;
  }

  &__cover {
    width: 148px;
    height: 210px;
    border-radius: var(--radius-md);
    object-fit: cover;
    box-shadow: 0 4px 16px rgba(44, 36, 32, 0.20), 0 1px 4px rgba(44, 36, 32, 0.10);
    flex-shrink: 0;

    &--placeholder {
      background: var(--color-bg-section);
    }
  }

  &__book-title {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    text-align: center;
    margin: 0;
    line-height: 1.4;
  }

  &__book-author {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    text-align: center;
    margin: 0;
  }

  &__abandon-btn {
    margin-top: auto;
    font-size: var(--text-xs);
    color: var(--color-error, #b83232);
    background: none;
    border: 1px solid currentColor;
    border-radius: var(--radius-pill);
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    transition: opacity var(--transition-fast);

    &:hover {
      opacity: 0.75;
    }
  }

  &__divider {
    width: 1px;
    background: var(--color-border-subtle);
    align-self: stretch;
    flex-shrink: 0;
  }

  &__right {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    padding-left: var(--space-6);
    min-width: 0;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);

    &--toggle {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
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
  }

  &__page-input {
    width: 72px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    font-size: var(--text-md);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    background: var(--color-bg-page);
    text-align: center;
    transition: border-color var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--color-accent);
    }

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      -webkit-appearance: none;
    }
  }

  &__page-total {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  &__progress-track {
    height: 8px;
    background: var(--color-bg-section);
    border-radius: var(--radius-pill);
    overflow: hidden;
  }

  &__progress-fill {
    height: 100%;
    background: var(--color-brand-primary);
    border-radius: var(--radius-pill);
    transition: width 150ms ease;
  }

  &__progress-pct {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    text-align: right;
  }

  &__toggle {
    width: 44px;
    height: 24px;
    border-radius: var(--radius-pill);
    background: var(--color-border-subtle);
    border: none;
    cursor: pointer;
    position: relative;
    transition: background var(--transition-fast);
    flex-shrink: 0;

    &--on {
      background: var(--color-brand-primary);
    }
  }

  &__toggle-knob {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    transition: transform var(--transition-fast);

    .progress-modal__toggle--on & {
      transform: translateX(20px);
    }
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
      border-color: var(--color-accent);
    }
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    padding: var(--space-4) 24px 20px;
    border-top: 1px solid var(--color-border-subtle);
    flex-shrink: 0;
  }

  &__save-btn {
    background: var(--color-accent);
    color: var(--color-text-on-brand);
    border: none;
    border-radius: var(--radius-pill);
    padding: var(--space-3) var(--space-6);
    font-family: var(--font-main);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    cursor: pointer;
    transition: background var(--transition-fast);

    &:hover:not(:disabled) {
      background: var(--color-accent-dark);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/UpdateProgressModal/
git commit -m "feat(progress): create UpdateProgressModal component"
```

---

## Task 6: Wire up CurrentReadingCard

**Files:**
- Modify: `src/components/CurrentReadingCard/CurrentReadingCard.tsx`

- [ ] **Step 1: Replace full file content**

```typescript
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useShelf } from "@/hooks/useShelf";
import { getCoverUrl } from "@/utils/coverImage";
import UpdateProgressModal from "@/components/UpdateProgressModal/UpdateProgressModal";
import "./CurrentReadingCard.scss";

const STREAK_DAYS = 12;

function FlameIcon() {
  return (
    <svg width="14" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z"/>
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

function CurrentReadingCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shelfByStatus, loading, getEntry } = useShelf();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const readingBooks = shelfByStatus.reading;
  const book = readingBooks[0] ?? null;
  const entry = book ? getEntry(book.key) : null;

  if (loading) {
    return <div className="reading-card reading-card--skeleton" />;
  }

  if (!book || !entry) {
    return <p className="reading-card__empty">{t("myLibrary.noCurrentReading")}</p>;
  }

  const totalPages = book.pages ?? 0;
  const currentPage = entry.currentPage ?? 0;
  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
  const coverSrc = book.cover_url ?? (book.cover_id ? getCoverUrl(book.cover_id) : undefined);

  return (
    <>
      <article className="reading-card">
        <button
          className="reading-card__cover-btn"
          onClick={() => navigate(`/book/${encodeURIComponent(book.key)}`, { state: { book } })}
          aria-label={t("book.coverAlt", { title: book.title })}
        >
          {coverSrc ? (
            <img
              className="reading-card__cover-img"
              src={coverSrc}
              alt=""
            />
          ) : (
            <div className="reading-card__cover-placeholder" />
          )}
        </button>

        <div className="reading-card__body">
          <div className="reading-card__header">
            <div>
              <h3 className="reading-card__title">{book.title}</h3>
              <p className="reading-card__author">{book.authors.join(", ")}</p>
            </div>
            <div className="reading-card__streak">
              <FlameIcon />
              <span>{t("myLibrary.streakDays", { count: STREAK_DAYS })}</span>
            </div>
          </div>

          <div className="reading-card__progress-box">
            <div className="reading-card__progress-labels">
              <span className="reading-card__progress-label">
                {t("myLibrary.readingProgress")}
              </span>
              <span className="reading-card__progress-pages">
                {t("myLibrary.pages", { current: currentPage, total: totalPages })}
              </span>
            </div>
            <div className="reading-card__progress-bar">
              <div
                className="reading-card__progress-fill"
                style={{ width: `${progressPercent}%` }}
              >
                <span className="reading-card__progress-percent">{progressPercent}%</span>
              </div>
            </div>
          </div>

          <div className="reading-card__actions">
            <button className="reading-card__btn-outline">{t("myLibrary.viewHistory")}</button>
            <button
              className="reading-card__btn-fill"
              onClick={() => setIsModalOpen(true)}
            >
              {t("myLibrary.updateProgress")}
            </button>
          </div>
        </div>

        <button
          className="reading-card__chevron"
          onClick={() => navigate(`/book/${encodeURIComponent(book.key)}`, { state: { book } })}
          aria-label={t("book.coverAlt", { title: book.title })}
        >
          <ChevronRightIcon />
        </button>
      </article>

      {isModalOpen && (
        <UpdateProgressModal
          entry={entry}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

export default CurrentReadingCard;
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/CurrentReadingCard/CurrentReadingCard.tsx
git commit -m "feat(progress): wire CurrentReadingCard to real data and open modal"
```

---

## Task 7: Update ActivityItem to render notes

**Files:**
- Modify: `src/components/ActivityItem/ActivityItem.tsx`
- Modify: `src/components/ActivityItem/ActivityItem.scss`

- [ ] **Step 1: Add note rendering to `ActivityItem.tsx`**

After the `StarRating` block (line 60), add:

```tsx
{item.note && (
  <p className="activity-item__note">{item.note}</p>
)}
```

The full updated `ActivityItem.tsx`:

```typescript
import type { ActivityItem as ActivityItemType } from "@/types/UserProfile";
import StarRating from "@/components/StarRating/StarRating";
import "./ActivityItem.scss";

const EVENT_LABELS: Record<string, string> = {
  reading_started: "Empezó a leer",
  book_finished: "Terminó de leer",
  progress: "Actualizó su progreso",
  review: "Escribió una reseña",
  list_created: "Creó una lista",
  watchlist_add: "Añadió a su lista",
};

function timeAgo(timestamp: { toDate: () => Date }): string {
  const now = Date.now();
  const then = timestamp.toDate().getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff <= 0) return "hace unos segundos";
  if (diff < 60) return "hace unos segundos";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

type ActivityItemProps = {
  item: ActivityItemType;
};

export default function ActivityItem({ item }: ActivityItemProps) {
  return (
    <div className="activity-item">
      {item.bookCoverUrl ? (
        <img
          className="activity-item__cover"
          src={item.bookCoverUrl}
          alt={item.bookTitle ?? ""}
        />
      ) : (
        <div className="activity-item__cover activity-item__cover--placeholder" />
      )}

      <div className="activity-item__info">
        <div className="activity-item__header">
          <span className="activity-item__event">
            {EVENT_LABELS[item.type] ?? item.type}
          </span>
          <span className="activity-item__time">{timeAgo(item.createdAt)}</span>
        </div>

        {item.bookTitle && (
          <p className="activity-item__book-title">{item.bookTitle}</p>
        )}
        {item.bookAuthor && (
          <p className="activity-item__book-author">{item.bookAuthor}</p>
        )}
        {item.listName && (
          <p className="activity-item__list-name">"{item.listName}"</p>
        )}
        {typeof item.rating === "number" && item.rating > 0 && (
          <StarRating rating={item.rating} size={14} />
        )}
        {item.note && (
          <p className="activity-item__note">{item.note}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `.activity-item__note` styles to `ActivityItem.scss`**

At the end of the `&__info` block, add the new element (inside `.activity-item`):

```scss
  &__note {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    font-style: italic;
    margin: 0;
    line-height: 1.5;
  }
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ActivityItem/ActivityItem.tsx src/components/ActivityItem/ActivityItem.scss
git commit -m "feat(progress): render activity note in ActivityItem"
```

---

## Manual Verification

After all tasks complete:

- [ ] Start dev server: `npm run dev`
- [ ] Log in, navigate to Mi Biblioteca. Confirm the currently-reading card shows `0/X págs.` (real data, not hardcoded 344/540).
- [ ] Click "Actualizar progreso". Confirm the modal opens with the book cover, title, author, and a page input starting at 0.
- [ ] Type a page number. Confirm the progress bar updates in real time.
- [ ] Type the last page (equal to total pages). Confirm the "Has terminado?" toggle activates automatically.
- [ ] Click the toggle manually. Confirm it sets `currentPage` to `totalPages`.
- [ ] Save. Confirm the modal closes and the progress bar in `CurrentReadingCard` reflects the new page count.
- [ ] Re-open the modal. Confirm it starts at the updated page, not 0.
- [ ] Add a note and save. Navigate to the profile page / activity section. Confirm the note appears below "Actualizó su progreso".
- [ ] Open the modal and click "Marcar como dejado". Confirm the book moves to the "No acabado" shelf and disappears from the reading card.
- [ ] Press Escape while the modal is open. Confirm it closes.
- [ ] Click the backdrop (outside the panel). Confirm it closes.
