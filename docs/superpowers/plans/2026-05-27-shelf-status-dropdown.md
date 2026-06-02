# ShelfStatusDropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `ShelfDropdownButton` (compact + detail variants) with a new reusable `ShelfStatusDropdown` component that matches the Figma design (node 1409:369), adds per-status Lucide icons, and includes an "Añadir a lista" option with a lazy-loaded multi-select submenu.

**Architecture:** New standalone component at `src/components/book/shelf-status-dropdown/`. All logic (shelf state, list lazy-load, click-outside, tooltip) lives inside the component. Contexts inject visual styles exclusively via a `classNames` prop. `ShelfDropdownButton` is kept untouched for `FeaturedBookCard`.

**Tech Stack:** React 19, TypeScript, SCSS/BEM, Lucide React, Firebase Firestore (`getLists`, `updateListDB`), i18next

**Spec:** `docs/superpowers/specs/2026-05-27-shelf-status-dropdown-design.md`

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/components/book/shelf-status-dropdown/ShelfStatusDropdown.tsx` | All logic: status, lists submenu, tooltip, open/close |
| Create | `src/components/book/shelf-status-dropdown/ShelfStatusDropdown.scss` | Internal elements only: chevron, separator, submenu |
| Modify | `src/components/book/cards/BookCard.tsx` | Swap import to ShelfStatusDropdown |
| Modify | `src/components/book/cards/BookCard.scss` | Restyle save-btn to text+icon pill; remove save-icon rule |
| Modify | `src/components/book/info/BookInfoCard.tsx` | Swap import to ShelfStatusDropdown |
| Modify | `src/components/book/info/BookInfoCard.scss` | Remove save-chevron/save-check rules; dropdown opens downward |
| Modify | `src/plugins/i18n/locales/es/book.json` | Add `book.add`, `book.addToList`, `book.noLists` |
| Modify | `src/plugins/i18n/locales/en/book.json` | Same keys in English |

---

## Task 1: Add i18n keys

**Files:**
- Modify: `src/plugins/i18n/locales/es/book.json`
- Modify: `src/plugins/i18n/locales/en/book.json`

- [ ] **Step 1: Add keys to Spanish file**

In `src/plugins/i18n/locales/es/book.json`, add three keys inside the `"book"` object (after `"saved"`):

```json
"add": "Añadir",
"addToList": "Añadir a lista",
"noLists": "No tienes listas creadas",
```

- [ ] **Step 2: Add keys to English file**

In `src/plugins/i18n/locales/en/book.json`, add the same three keys inside `"book"` (after `"saved"`):

```json
"add": "Add",
"addToList": "Add to list",
"noLists": "You have no lists yet",
```

- [ ] **Step 3: Commit**

```bash
git add src/plugins/i18n/locales/es/book.json src/plugins/i18n/locales/en/book.json
git commit -m "feat(i18n): añade claves book.add, book.addToList y book.noLists"
```

---

## Task 2: Create ShelfStatusDropdown component

**Files:**
- Create: `src/components/book/shelf-status-dropdown/ShelfStatusDropdown.tsx`

- [ ] **Step 1: Create the component file**

Create `src/components/book/shelf-status-dropdown/ShelfStatusDropdown.tsx` with this exact content:

```tsx
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bookmark, BookOpen, BookCheck, BookX,
  ChevronDown, ChevronRight, ListPlus, Check, Plus,
} from "lucide-react";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import type { BookList, ListBook } from "@/types/BookList";
import { useAuth } from "@/context/auth/useAuth";
import { useShelf } from "@/context/shelf/useShelf";
import { useClickOutside } from "@/hooks/useClickOutside";
import { getLists, updateListDB } from "@/services/firebase/firebaseLists";
import { encodeKey } from "@/utils/bookPaths";
import { bem } from "@/utils/className";
import "./ShelfStatusDropdown.scss";

const SHELF_OPTIONS: ShelfStatus[] = ["wantToRead", "reading", "finished", "didNotFinish"];

const STATUS_ICONS: Record<ShelfStatus, React.ElementType> = {
  wantToRead: Bookmark,
  reading: BookOpen,
  finished: BookCheck,
  didNotFinish: BookX,
};

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

export default function ShelfStatusDropdown({ book, classNames }: ShelfStatusDropdownProps) {
  const { t } = useTranslation();
  const { addBook, removeBook, getStatus } = useShelf();
  const { isAuthenticated, user } = useAuth();
  const saved = getStatus(book.key);

  const [open, setOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [lists, setLists] = useState<BookList[] | null>(null);
  const [listsLoading, setListsLoading] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useClickOutside(wrapperRef, () => {
    setOpen(false);
    setSubmenuOpen(false);
  }, open);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  const loadLists = () => {
    if (!user || lists !== null || listsLoading) return;
    setListsLoading(true);
    getLists(user.uid)
      .then((l) => setLists(l))
      .catch(() => setLists([]))
      .finally(() => setListsLoading(false));
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setTooltipVisible(true);
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = setTimeout(() => setTooltipVisible(false), 2000);
      return;
    }
    setSubmenuOpen(false);
    setOpen((o) => !o);
  };

  const handleStatusSelect = (e: React.MouseEvent, status: ShelfStatus) => {
    e.stopPropagation();
    if (saved === status) removeBook(book.key);
    else addBook(book, status);
    setOpen(false);
    setSubmenuOpen(false);
  };

  const handleAddToListClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    loadLists();
    setSubmenuOpen((s) => !s);
  };

  const handleToggleList = async (e: React.MouseEvent, list: BookList) => {
    e.stopPropagation();
    if (!user || !lists) return;
    const encodedKey = encodeKey(book.key);
    const alreadyIn = list.books.some((b) => b.key === encodedKey);
    const listBook: ListBook = {
      key: encodedKey,
      title: book.title,
      authors: book.authors,
      cover_url: book.cover_url ?? undefined,
    };
    const newBooks = alreadyIn
      ? list.books.filter((b) => b.key !== encodedKey)
      : [...list.books, listBook];
    setLists((prev) =>
      prev?.map((l) => (l.id === list.id ? { ...l, books: newBooks } : l)) ?? null
    );
    try {
      await updateListDB(user.uid, list.id, { books: newBooks });
    } catch {
      setLists((prev) =>
        prev?.map((l) => (l.id === list.id ? list : l)) ?? null
      );
    }
  };

  const StatusIcon = saved ? STATUS_ICONS[saved] : null;

  return (
    <div className={bem(classNames?.root, { open })} ref={wrapperRef}>
      {tooltipVisible && classNames?.tooltip && (
        <span className={classNames.tooltip}>{t("explore.saveTooltip")}</span>
      )}

      <button
        type="button"
        className={bem(classNames?.btn, { open, saved: !!saved })}
        onClick={handleTriggerClick}
        aria-label={saved ? t(`myLibrary.shelf.${saved}`) : t("book.add")}
      >
        {StatusIcon && <StatusIcon size={14} />}
        <span>{saved ? t(`myLibrary.shelf.${saved}`) : t("book.add")}</span>
        <ChevronDown
          size={12}
          className={bem("shelf-status-dropdown__chevron", { open })}
        />
      </button>

      {open && (
        <ul
          className={classNames?.list}
          onClick={(e) => e.stopPropagation()}
        >
          {SHELF_OPTIONS.map((opt) => {
            const Icon = STATUS_ICONS[opt];
            return (
              <li key={opt}>
                <button
                  type="button"
                  className={bem(classNames?.item, { active: saved === opt })}
                  onClick={(e) => handleStatusSelect(e, opt)}
                >
                  <Icon size={14} />
                  {t(`myLibrary.shelf.${opt}`)}
                </button>
              </li>
            );
          })}

          {isAuthenticated && (
            <>
          <li role="separator" aria-hidden="true" className="shelf-status-dropdown__separator" />

          <li className="shelf-status-dropdown__submenu-item">
            <button
              type="button"
              className={bem(classNames?.item, { "submenu-open": submenuOpen })}
              onClick={handleAddToListClick}
            >
              <ListPlus size={14} />
              {t("book.addToList")}
              <ChevronRight
                size={12}
                className={bem("shelf-status-dropdown__submenu-arrow", { open: submenuOpen })}
              />
            </button>

            {submenuOpen && (
              <ul className="shelf-status-dropdown__submenu">
                {listsLoading ? (
                  <li className="shelf-status-dropdown__submenu-empty">
                    {t("bookDetail.loading")}
                  </li>
                ) : lists && lists.length > 0 ? (
                  lists.map((list) => {
                    const inList = list.books.some(
                      (b) => b.key === encodeKey(book.key)
                    );
                    return (
                      <li key={list.id}>
                        <button
                          type="button"
                          className={bem("shelf-status-dropdown__submenu-btn", { active: inList })}
                          onClick={(e) => handleToggleList(e, list)}
                        >
                          {inList ? <Check size={12} /> : <Plus size={12} />}
                          <span>{list.name}</span>
                        </button>
                      </li>
                    );
                  })
                ) : (
                  <li className="shelf-status-dropdown__submenu-empty">
                    {t("book.noLists")}
                  </li>
                )}
              </ul>
            )}
          </li>
            </>
          )}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no TypeScript errors in `ShelfStatusDropdown.tsx`. (The build may warn about missing SCSS — that's fine, Task 3 adds it.)

- [ ] **Step 3: Commit**

```bash
git add src/components/book/shelf-status-dropdown/ShelfStatusDropdown.tsx
git commit -m "feat: crea componente ShelfStatusDropdown con iconos por estado y submenú de listas"
```

---

## Task 3: Create ShelfStatusDropdown styles

**Files:**
- Create: `src/components/book/shelf-status-dropdown/ShelfStatusDropdown.scss`

This file only styles the component's internal elements (chevron rotation, separator, submenu). Context-specific styles (trigger button, dropdown position) live in `BookCard.scss` and `BookInfoCard.scss`.

- [ ] **Step 1: Create the SCSS file**

Create `src/components/book/shelf-status-dropdown/ShelfStatusDropdown.scss`:

```scss
@use "../../../styles/shared" as *;

.shelf-status-dropdown {
  &__chevron {
    flex-shrink: 0;
    transition: transform var(--transition-fast);
    margin-left: auto;

    &--open {
      transform: rotate(180deg);
    }
  }

  &__separator {
    height: 1px;
    background: var(--color-border-outline);
    margin: var(--space-1) var(--space-2);
    list-style: none;
  }

  &__submenu-item {
    position: relative;
  }

  &__submenu-arrow {
    flex-shrink: 0;
    margin-left: auto;
    transition: transform var(--transition-fast);

    &--open {
      transform: rotate(90deg);
    }
  }

  &__submenu {
    list-style: none;
    margin: var(--space-1) 0 0;
    padding: var(--space-2);
    background: var(--color-bg-page);
    border: 1px solid var(--color-border-outline);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card-hover);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    animation: dropdownIn var(--transition-base) ease-out forwards;
  }

  &__submenu-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: 8px var(--space-3);
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    font-family: var(--font-main);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--color-text-primary);
    cursor: pointer;
    text-align: left;
    transition: background var(--transition-fast);

    &:hover {
      background: var(--color-neutral-alpha-muted);
    }

    &--active {
      background: var(--color-neutral-alpha-muted);
      font-weight: var(--weight-semibold);
    }

    svg {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
    }
  }

  &__submenu-empty {
    padding: 8px var(--space-3);
    font-family: var(--font-main);
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    font-style: italic;
    list-style: none;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/book/shelf-status-dropdown/ShelfStatusDropdown.scss
git commit -m "feat: añade estilos internos de ShelfStatusDropdown"
```

---

## Task 4: Update BookCard

**Files:**
- Modify: `src/components/book/cards/BookCard.tsx`

- [ ] **Step 1: Replace the import**

In `BookCard.tsx`, replace:

```tsx
import ShelfDropdownButton from "@/components/book/shelf-dropdown/ShelfDropdownButton";
```

with:

```tsx
import ShelfStatusDropdown from "@/components/book/shelf-status-dropdown/ShelfStatusDropdown";
```

- [ ] **Step 2: Replace the component usage**

Replace the `<ShelfDropdownButton … />` block:

```tsx
      <ShelfDropdownButton
        book={book}
        variant="compact"
        classNames={{
          root: "book-card__save-wrapper",
          btn: "book-card__save-btn",
          list: "book-card__dropdown",
          item: "book-card__dropdown-item",
          tooltip: "book-card__tooltip",
          icon: "book-card__save-icon",
        }}
      />
```

with:

```tsx
      <ShelfStatusDropdown
        book={book}
        classNames={{
          root: "book-card__save-wrapper",
          btn: "book-card__save-btn",
          list: "book-card__dropdown",
          item: "book-card__dropdown-item",
          tooltip: "book-card__tooltip",
        }}
      />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/book/cards/BookCard.tsx
git commit -m "feat: BookCard usa ShelfStatusDropdown en lugar de ShelfDropdownButton"
```

---

## Task 5: Update BookCard.scss for new trigger design

**Files:**
- Modify: `src/components/book/cards/BookCard.scss`

The trigger changes from a 36×36 circular icon-only button to a compact pill showing `[icon] [text] [chevron]`. The dropdown styles stay similar (already opens downward).

- [ ] **Step 1: Replace the `__save-btn` block**

Find and replace the entire `&__save-btn { … }` block (including `&--open` and `&--saved` sub-rules and the inner `svg` rule):

```scss
  &__save-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 6px var(--space-2);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-outline);
    background: var(--color-bg-page);
    font-family: var(--font-main);
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    cursor: pointer;
    white-space: nowrap;
    transition: border-color var(--transition-fast);

    &:hover {
      border-color: var(--color-text-primary);
    }

    &--open {
      border-color: var(--color-text-primary);
    }

    svg {
      flex-shrink: 0;
    }
  }
```

- [ ] **Step 2: Remove the `__save-icon` block**

Delete the entire `&__save-icon { … }` rule (it was only used for the `+` rotation animation, which the new component no longer needs).

- [ ] **Step 3: Start dev server and verify visually**

```bash
npm run dev
```

Open the app in a browser (typically `http://localhost:5173`). Navigate to a page with BookCards (e.g. Explore or Search).

Verify:
- Each card shows a small pill button at top-left of the cover with label "Añadir" and a down-chevron
- Clicking the pill opens a dropdown downward with 4 status options (each with its icon) + separator + "Añadir a lista"
- Selecting a status changes the button to show that status icon + label + chevron
- Clicking the active status removes the book from the shelf and returns to "Añadir"
- Clicking "Añadir a lista" shows the submenu with the user's lists
- Clicking a list toggles the book in/out; a check icon marks lists that already contain the book
- Clicking outside closes everything

- [ ] **Step 4: Commit**

```bash
git add src/components/book/cards/BookCard.scss
git commit -m "feat: rediseña BookCard save-btn como píldora con icono, texto y chevron"
```

---

## Task 6: Update BookInfoCard

**Files:**
- Modify: `src/components/book/info/BookInfoCard.tsx`

- [ ] **Step 1: Replace the import**

In `BookInfoCard.tsx`, replace:

```tsx
import ShelfDropdownButton from "@/components/book/shelf-dropdown/ShelfDropdownButton";
```

with:

```tsx
import ShelfStatusDropdown from "@/components/book/shelf-status-dropdown/ShelfStatusDropdown";
```

- [ ] **Step 2: Replace the component usage**

Replace the `<ShelfDropdownButton … />` block:

```tsx
            <ShelfDropdownButton
              book={bookForShelf}
              variant="detail"
              classNames={{
                root: "book-info-card__save-wrapper",
                btn: "book-info-card__save-btn",
                list: "book-info-card__dropdown",
                item: "book-info-card__dropdown-item",
                tooltip: "book-info-card__tooltip",
                icon: "book-info-card__save-check",
              }}
            />
```

with:

```tsx
            <ShelfStatusDropdown
              book={bookForShelf}
              classNames={{
                root: "book-info-card__save-wrapper",
                btn: "book-info-card__save-btn",
                list: "book-info-card__dropdown",
                item: "book-info-card__dropdown-item",
                tooltip: "book-info-card__tooltip",
              }}
            />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/book/info/BookInfoCard.tsx
git commit -m "feat: BookInfoCard usa ShelfStatusDropdown en lugar de ShelfDropdownButton"
```

---

## Task 7: Update BookInfoCard.scss

**Files:**
- Modify: `src/components/book/info/BookInfoCard.scss`

The detail CTA keeps its larger, prominent button style, but now renders `[icon] [status text] [chevron]`. The dropdown changes from opening to the right (desktop) to always opening downward.

- [ ] **Step 1: Replace the `__save-btn` block**

Find and replace the entire `&__save-btn { … }` block (including `&--saved` and `&:hover` sub-rules):

```scss
  &__save-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 10px 20px;
    border-radius: var(--radius-sm);
    border: 2px solid var(--color-text-primary);
    background: var(--color-text-primary);
    font-family: var(--font-main);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    color: var(--color-btn-primary-fg);
    cursor: pointer;
    white-space: nowrap;
    transition:
      background var(--transition-fast),
      color var(--transition-fast),
      border-color var(--transition-fast),
      transform 100ms;

    &:hover {
      background: var(--color-btn-primary-hover);
      border-color: var(--color-btn-primary-hover);
    }

    &:active {
      transform: scale(0.97);
    }

    &--saved {
      background: transparent;
      border-color: var(--color-border-medium);
      color: var(--color-text-primary);

      &:hover {
        background: transparent;
        border-color: var(--color-text-primary);
      }
    }

    svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
  }
```

- [ ] **Step 2: Remove obsolete rules**

Delete the following blocks entirely — they are no longer needed:
- `&__save-check { … }`
- `&__save-chevron { … }`
- `&__save-btn:hover &__save-chevron, &__save-btn--open &__save-chevron { … }`

- [ ] **Step 3: Update `__dropdown` to open downward**

Find the `&__dropdown` block. It currently has a `@include from($bp-md)` override that positions it to the right of the button. Remove that override so the dropdown always opens downward:

Replace the entire `&__dropdown { … }` block with:

```scss
  &__dropdown {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: auto;
    background: var(--color-bg-page);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card-hover);
    padding: var(--space-2);
    min-width: 200px;
    z-index: 200;
    list-style: none;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    animation: dropdown-in 180ms ease-out forwards;
  }
```

- [ ] **Step 4: Start dev server and verify visually**

```bash
npm run dev
```

Navigate to a book detail page (click any book card).

Verify:
- The CTA at the bottom of the info card shows "Añadir" + chevron when the book is not saved
- Clicking opens a dropdown **downward** (not to the right)
- Selecting a status updates the button to show the status icon + label
- The "Añadir a lista" option and submenu work the same as in BookCard
- Both mobile and desktop layouts look correct (dropdown no longer flies off to the right on desktop)

- [ ] **Step 5: Commit**

```bash
git add src/components/book/info/BookInfoCard.scss
git commit -m "feat: actualiza BookInfoCard con nuevo estilo del CTA y dropdown siempre hacia abajo"
```

---

## Final verification

- [ ] Run `npm run build` — zero TypeScript errors, zero lint errors
- [ ] Run through all manual tests listed in the spec (`docs/superpowers/specs/2026-05-27-shelf-status-dropdown-design.md` — Tests table)
- [ ] Confirm `ShelfDropdownButton` is still used and working in `FeaturedBookCard` (no regressions)
