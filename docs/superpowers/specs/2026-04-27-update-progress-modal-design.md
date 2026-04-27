# Update Progress Modal — Design Spec

**Date:** 2026-04-27  
**Status:** Approved  
**Reference:** https://github.com/taniacanto1/trama-test (`/trama/src/pages/ProgressModal.tsx`)

---

## Overview

The "Actualizar progreso" button in `CurrentReadingCard` currently has no `onClick` handler and does nothing. This spec covers the full implementation of the update progress modal: a new component, Firestore persistence for `currentPage`, activity logging with optional notes, and wiring the `CurrentReadingCard` to real data.

---

## Data Model

### ShelfEntry (extended)

File: `src/services/firebase/firebase_library.ts`

Add one optional field:

```ts
currentPage?: number
```

- `totalPages` is already stored in `ShelfEntry` via `book.pages` (from OpenLibrary). No change needed.
- `progressPercent` is always derived on the client: `(currentPage / totalPages) * 100`.
- `finished` is also derived: `currentPage === totalPages`. It is not stored as a separate field.
- Existing Firestore documents without `currentPage` are treated as `currentPage = 0`.

### ActivityEvent (extended)

File: `src/types/UserProfile.ts`

Add one optional field:

```ts
note?: string
```

Notes are stored only in the activity document (`Users/{uid}/activity/{id}`), not in the `ShelfEntry`. They appear in the activity feed but are not retrievable per-book. Expanding notes to per-book storage is out of scope.

---

## Firebase Service Layer

File: `src/services/firebase/firebase_library.ts`

New function: `updateReadingProgress(uid, bookKey, currentPage, totalPages, note?)`

1. `updateDoc` on `Users/{uid}/Shelf/{bookKey}` with `{ currentPage }`.
2. `logActivity` with `{ type: "progress", bookId, bookTitle, bookCoverUrl, bookAuthor, progress: currentPage, note }`.
3. If `currentPage === totalPages` (book finished): also updates `status` to `"finished"` in the same `updateDoc` call, and logs an additional `{ type: "book_finished" }` activity event.

`totalPages` is passed by the caller (ShelfContext has the full `ShelfEntry` in memory and provides `book.pages`).

"Marcar como dejado" (abandon) uses the existing status-change mechanism to set status to `"didNotFinish"`. No new service function needed for this action.

---

## Context and Hook

File: `src/context/ShelfContext.tsx`

New method added to `ShelfContext`: `updateProgress(bookKey, currentPage, note?)`

- Applies an **optimistic update** immediately to the in-memory `Map<encodedKey, ShelfEntry>` (same pattern as `addBook`/`removeBook`).
- Calls `updateReadingProgress` from the service layer.
- Rolls back the in-memory update on error.

`useShelf()` exposes the new method. No new hook or context is created.

---

## UpdateProgressModal Component

Location: `src/components/UpdateProgressModal/`  
Files: `UpdateProgressModal.tsx` + `UpdateProgressModal.scss`

### Props

```ts
interface UpdateProgressModalProps {
  book: ShelfEntry;
  onClose: () => void;
}
```

### Internal state

| Field | Type | Initial value |
|-------|------|---------------|
| `currentPage` | `number` | `shelfEntry.currentPage ?? 0` |
| `note` | `string` | `""` |
| `isSubmitting` | `boolean` | `false` |

`finished` is derived: `currentPage === book.book.pages`.

### Layout

Three-zone horizontal layout (matches reference design):

- **Left**: book cover + title + author + "Marcar como dejado" button
- **Center**: 1px vertical divider
- **Right**: page input, real-time progress bar, "Has terminado?" toggle (read-only, driven by `finished`), optional notes textarea

### Behavior

- **Page input**: `type="number"`, `min=0`, `max=book.book.pages`. Value clamped on change with `Math.max(0, Math.min(value, totalPages))`. Updates progress bar in real time.
- **Finished toggle**: activates automatically when `currentPage === totalPages`. The toggle is also clickable as a shortcut — clicking it sets `currentPage` to `totalPages`.
- **Save button**: disabled while `isSubmitting`. On click: calls `updateProgress`, then `onClose`.
- **"Marcar como dejado"**: calls existing status-change logic to `"didNotFinish"`, then `onClose`.
- **Backdrop click**: detected via `mousedown` event on the backdrop + `ref` on the panel. Click outside panel → close.
- **Escape key**: `useEffect` listens for `keydown`, calls `onClose` on Escape.
- **Body scroll lock**: `document.body.style.overflow = "hidden"` on mount, restored on unmount.

### Styling

- SCSS with BEM naming, consistent with existing modals.
- Backdrop: fixed overlay with blur (`backdrop-filter: blur(6px)`).
- Panel: centered, `max-width: 760px`, `box-shadow: var(--shadow-modal)`.
- Entrance animations: `fadeIn` on backdrop (180ms), `slideUp` on panel (220ms).
- Uses existing CSS custom properties (`--color-brand-primary`, `--color-text-primary`, `--color-border-subtle`, `--shadow-modal`, `--radius-lg`, etc.).

### Rendering

Rendered via `createPortal` into `document.body` — same pattern as existing modals in the project.

---

## CurrentReadingCard

File: `src/components/CurrentReadingCard/CurrentReadingCard.tsx`

Changes:
- Remove hardcoded constants `CURRENT_PAGE`, `TOTAL_PAGES`, `PROGRESS_PERCENT`.
- Receives the currently-reading `ShelfEntry` as a prop from `MyLibraryPage` (which already has `shelfByStatus` from `useShelf()`).
- Derive `currentPage`, `totalPages`, and `progressPercent` from real shelf data.
- "Actualizar progreso" button gains `onClick` handler that sets local state `isModalOpen = true`.
- Renders `<UpdateProgressModal>` (via portal) when `isModalOpen` is true, passing `book` and `onClose`.

---

## ActivityItem

File: `src/components/ActivityItem/ActivityItem.tsx`

Change:
- When `item.note` is defined and non-empty, render it below the existing activity text.
- Style: smaller font size (`--text-sm`), color `--color-text-tertiary`, italic or regular (follow existing visual hierarchy).

---

## Out of scope

- Per-book notes history (retrievable list of all notes for a book)
- ProgressSection connection to real data (separate feature, currently uses mock data)
- Reading statistics (pages per day, weekly goals)
