# Shelf Status Dropdown — Design Spec

**Date:** 2026-05-27  
**Status:** Approved

---

## Overview

Replace the current `ShelfDropdownButton` (compact and detail variants) with a new general-purpose `ShelfStatusDropdown` component. The new component matches the Figma autolayout design (node 1409:369), uses Lucide React icons per status, always opens downward, and adds an "Añadir a lista" option with a lazy-loaded multi-select submenu.

`ShelfDropdownButton` remains in use only for `FeaturedBookCard` (featured variant), which has a distinct visual design not in scope.

---

## Figma Reference

File: `5rQBSCq5g8VHJPUviYWcjM`, node `1409:369`

Trigger button structure: `[status-icon] [status-label] [ChevronDown]`  
Font: Manrope SemiBold 10px, border 1px solid, border-radius 6px, padding 6px/8px.

---

## Architecture

### New files

- `src/components/book/shelf-status-dropdown/ShelfStatusDropdown.tsx`
- `src/components/book/shelf-status-dropdown/ShelfStatusDropdown.scss`

### Modified files

- `src/components/book/cards/BookCard.tsx` — replace `ShelfDropdownButton` with `ShelfStatusDropdown`
- `src/components/book/cards/BookCard.scss` — update trigger/dropdown styles
- `src/components/book/info/BookInfoCard.tsx` — replace `ShelfDropdownButton` with `ShelfStatusDropdown`
- `src/components/book/info/BookInfoCard.scss` — adapt styles
- `src/plugins/i18n/locales/es/*.json` and `en/*.json` — add keys for "Añadir", "Añadir a lista", loading state

### Untouched files

- `ShelfDropdownButton.tsx` — kept for `FeaturedBookCard`
- `firebaseLists.ts`, `useLists.ts` — used as-is

---

## Component API

```ts
type ShelfStatusDropdownProps = {
  book: Book;
  classNames?: Partial<{
    root: string;
    btn: string;
    list: string;
    item: string;
    tooltip: string;
  }>;
};
```

No `variant` prop. Visual differences between contexts are handled entirely via `classNames`.

---

## Trigger Button

| State | Content |
|---|---|
| No status (unsaved) | `"Añadir"` + `ChevronDown` |
| Status saved | `[status-icon]` + `[status-label]` + `ChevronDown` |

### Status icons (Lucide React)

| Status key | Icon | Label (es) |
|---|---|---|
| `wantToRead` | `Bookmark` | Quiero leer |
| `reading` | `BookOpen` | Leyendo |
| `finished` | `BookCheck` | Acabado |
| `didNotFinish` | `BookX` | No acabado |

---

## Dropdown

Opens **downward** from the trigger. Closes on click outside (via existing `useClickOutside` hook).

### Items

1. `Bookmark` — Quiero leer
2. `BookOpen` — Leyendo
3. `BookCheck` — Acabado
4. `BookX` — No acabado
5. Separator (`<hr>`)
6. `ListPlus` — Añadir a lista ▶

The active item (current status) is visually highlighted. Clicking the active item removes the book from the shelf.

---

## "Añadir a lista" Submenu

Opens adjacent to the item (right on desktop, below on mobile if space is constrained).

### Loading behavior

- Lists are fetched **lazy**: `getLists(uid)` is called only the first time the submenu opens.
- While loading: spinner or skeleton row.
- On error: show empty state.

### List items

Each list displays:
- List name
- A `Check` icon if the book is already in that list, or a `Plus` icon if not

Behavior is a **multi-select toggle**: clicking any list independently adds or removes the book from that list. Multiple lists can contain the same book simultaneously.

### Adding/removing a book from a list

Uses the existing `updateList(listId, { books: [...] })` from `useLists`.

- **Add:** append a `ListBook` snapshot `{ key: encodeKey(book.key), title, authors, cover_url }` to `list.books`
- **Remove:** filter out the book by key
- The check is `list.books.some(b => b.key === encodeKey(book.key))`

### Empty state

If the user has no lists, show a short message (e.g. "No tienes listas creadas").

---

## Authentication

The trigger button is always visible regardless of auth state.

| Auth state | Behavior on trigger click |
|---|---|
| Unauthenticated | Show tooltip `t("explore.saveTooltip")` for 2 s, do not open dropdown |
| Authenticated | Open dropdown normally |

The "Añadir a lista" option is hidden entirely from the dropdown when the user is not authenticated (no lists to show).

---

## i18n keys to add

| Key | es | en |
|---|---|---|
| `book.add` | Añadir | Add |
| `book.addToList` | Añadir a lista | Add to list |
| `book.noLists` | No tienes listas creadas | You have no lists yet |

---

## Tests (manual)

| Scenario | Expected result |
|---|---|
| Unsaved book, not authenticated — click "Añadir" | Login tooltip appears, dropdown does not open |
| Unsaved book, authenticated — click "Añadir" | Dropdown opens downward with 4 options + separator + "Añadir a lista" |
| Select "Quiero leer" | Button changes to `Bookmark` + "Quiero leer" + chevron; item highlighted |
| Click already-active status | Book removed from shelf, button returns to "Añadir" |
| Hover/click "Añadir a lista" | Submenu opens with user's lists |
| List that already contains the book | Shown with `Check` icon |
| Click unchecked list | Book added; list shows `Check`; other lists unchanged |
| Click checked list | Book removed from that list; shows `Plus`; other lists unchanged |
| No lists created | Submenu shows empty-state message |
| Click outside open dropdown | Dropdown and submenu close |
| BookInfoCard — same component | Identical behavior, context-specific styles only |
