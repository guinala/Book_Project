# FeaturedBookCard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `FeaturedBookCard`, a horizontal book card that spans 3 of 6 grid columns in an `ExploreSection`, and wire it up for the "because-reading" section in `ExplorePage`.

**Architecture:** Standalone `FeaturedBookCard` component that mirrors `BookCard`'s shelf/auth logic but uses a horizontal layout (cover left, meta + synopsis + title/rating/buttons right). `ExploreSection` gains a `featured` prop that renders the first book as `FeaturedBookCard` and applies an `explore-section__grid--featured` modifier class to the grid. `ExplorePage` passes `featured={true}` to "because-reading" sections only.

**Tech Stack:** React 19, TypeScript, SCSS/BEM + CSS custom properties, react-router, react-i18next, lucide-react, `useShelf`/`useAuth` hooks, `getCoverUrl`, `encodeKey`, `genreToI18nKey`.

---

## File Map

| File | Action |
|------|--------|
| `src/types/Book.ts` | Modify — add `synopsis?: string` |
| `src/plugins/i18n/locales/es/book.json` | Modify — add `meta.*`, `viewPage`, `save`, `saved` keys |
| `src/plugins/i18n/locales/en/book.json` | Modify — add `meta.*`, `viewPage`, `save`, `saved` keys |
| `src/components/book/cards/FeaturedBookCard.scss` | Create |
| `src/components/book/cards/FeaturedBookCard.tsx` | Create |
| `src/components/explore/ExploreSection.tsx` | Modify — `featured` prop + FeaturedBookCard render |
| `src/components/explore/ExploreSection.scss` | Modify — `--featured` grid modifier |
| `src/pages/explore/ExplorePage.tsx` | Modify — pass `featured` to because-reading |

---

## Task 1: Extend types and add i18n keys

**Files:**
- Modify: `src/types/Book.ts`
- Modify: `src/plugins/i18n/locales/es/book.json`
- Modify: `src/plugins/i18n/locales/en/book.json`

- [ ] **Step 1: Add `synopsis` to Book type**

In `src/types/Book.ts`, add `synopsis?: string;` after `pages?: number;`. Full file after edit:

```ts
export type Book = {
  key: string;
  title: string;
  titles?: Record<string, string>; 
  authors: string[];
  authorKeys?: string[];
  first_publish_year: number;
  cover_id: number | null;
  cover_url?: string;
  edition_count: number;
  genre?: string;
  genre2?: string;
  topics?: string[];
  rating?: number;       
  ratingCount?: number;
  isbn?: string;
  isbns?: Record<string, string>; 
  pages?: number;
  synopsis?: string;
  shelfCategory?: string;
}
```

- [ ] **Step 2: Add i18n keys to `es/book.json`**

Add inside the `"book"` object, after `"starRatingLabel"`:

```json
"meta": {
  "genre": "Género",
  "pages": "Páginas",
  "year": "Año"
},
"viewPage": "Ver página",
"save": "Guardar",
"saved": "Guardado"
```

- [ ] **Step 3: Add i18n keys to `en/book.json`**

Add inside the `"book"` object, after `"starRatingLabel"`:

```json
"meta": {
  "genre": "Genre",
  "pages": "Pages",
  "year": "Year"
},
"viewPage": "View page",
"save": "Save",
"saved": "Saved"
```

- [ ] **Step 4: Type-check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/Book.ts src/plugins/i18n/locales/es/book.json src/plugins/i18n/locales/en/book.json
git commit -m "feat(book): add synopsis field and FeaturedBookCard i18n keys"
```

---

## Task 2: Create FeaturedBookCard styles

**Files:**
- Create: `src/components/book/cards/FeaturedBookCard.scss`

- [ ] **Step 1: Create `FeaturedBookCard.scss`**

```scss
@use "../../../styles/shared" as *;

.featured-book-card {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-outline);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: box-shadow var(--transition-base);
  overflow: hidden;

  &:hover {
    box-shadow: var(--shadow-card-hover);
  }

  &--open {
    z-index: 50;
  }

  @include from($bp-md) {
    flex-direction: row;
  }

  // Cover wrapper: padding 8px all sides, cover stretches to card height at md+
  &__cover-wrapper {
    width: 100%;
    padding: var(--space-2);
    display: flex;
    align-items: stretch;
    flex-shrink: 0;

    @include from($bp-md) {
      width: 216px;
    }
  }

  &__cover {
    width: 100%;
    aspect-ratio: 2 / 3;
    border-radius: var(--radius-md);
    object-fit: cover;
    display: block;

    @include from($bp-md) {
      flex: 1;
      aspect-ratio: unset;
      min-height: 0;
    }
  }

  &__cover-placeholder {
    width: 100%;
    aspect-ratio: 2 / 3;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, var(--color-bg-secondary), var(--color-border-medium));
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      width: 32px;
      height: 32px;
      opacity: 0.3;
      color: var(--color-text-tertiary);
    }

    @include from($bp-md) {
      flex: 1;
      aspect-ratio: unset;
    }
  }

  // Body: same vertical padding as cover wrapper so both bottom edges align
  &__body {
    flex: 1;
    min-width: 0;
    padding: var(--space-2) var(--space-3) var(--space-2) var(--space-2);
    display: flex;
    flex-direction: column;
    gap: 10px;

    @include from($bp-md) {
      padding: var(--space-2) 14px var(--space-2) var(--space-1);
    }
  }

  // Meta bar
  &__meta {
    display: flex;
    border: 1px solid var(--color-border-outline);
    border-radius: var(--radius-md);
    overflow: hidden;
    flex-shrink: 0;
  }

  &__meta-item {
    flex: 1;
    padding: 4px var(--space-2);
    display: flex;
    align-items: center;
    gap: 4px;
    border-right: 1px solid var(--color-border-outline);
    min-width: 0;

    &:last-child {
      border-right: none;
    }
  }

  &__meta-label {
    font-weight: var(--weight-semibold);
    color: var(--color-text-tertiary);
    font-size: 10px;
    flex-shrink: 0;
  }

  &__meta-dot {
    color: var(--color-border-strong);
    font-size: 8px;
    flex-shrink: 0;
  }

  &__meta-value {
    color: var(--color-text-secondary);
    font-size: 10px;
    @include text-truncate;
  }

  // Synopsis: fills available space with bottom fade
  &__synopsis {
    font-family: var(--font-editorial);
    font-style: italic;
    font-size: var(--text-xs);
    line-height: 1.65;
    color: var(--color-text-primary);
    flex: 1;
    overflow: hidden;
    border-left: 2px solid var(--color-border-strong);
    padding-left: var(--space-2);
    margin: 0;
    -webkit-mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
    mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
  }

  // Title/author/rating: anchors to bottom when no synopsis via margin-top: auto
  &__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex-shrink: 0;
    margin-top: auto;
  }

  &__title {
    font-family: var(--font-editorial);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    line-height: 1.25;
    color: var(--color-text-primary);
    margin: 0;
    @include text-truncate;
  }

  &__author {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    margin: 0;
    @include text-truncate;
  }

  &__rating {
    display: flex;
    align-items: center;
    gap: 3px;
    margin-top: 1px;
  }

  &__star {
    color: var(--color-brand-primary);
  }

  &__rating-value {
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
  }

  &__rating-count {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
  }

  // Action buttons
  &__btns {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  &__btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-family: var(--font-main);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    cursor: pointer;
    border: none;

    &--outline {
      background: transparent;
      border: 1px solid var(--color-text-primary);
      color: var(--color-text-primary);
      transition: background var(--transition-fast);

      &:hover {
        background: var(--color-neutral-alpha-muted);
      }
    }

    &--solid {
      background: var(--color-text-primary);
      color: var(--color-btn-primary-fg);
      border: 1px solid transparent;
      transition: background var(--transition-fast);

      &:hover {
        background: var(--color-btn-primary-hover);
      }
    }

    &--saved {
      background: var(--color-btn-primary-hover);
      border-color: var(--color-btn-primary-hover);
    }
  }

  // Save wrapper: relative container for Guardar button + dropdown
  &__save-wrapper {
    position: relative;
    flex: 1;
    display: flex;

    .featured-book-card__btn {
      width: 100%;
    }
  }

  &__dropdown {
    position: absolute;
    bottom: calc(100% + var(--space-2));
    right: 0;
    list-style: none;
    margin: 0;
    padding: var(--space-2);
    background: var(--color-bg-page);
    border: 1px solid var(--color-border-outline);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card-hover);
    min-width: 168px;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    z-index: 10;
    animation: fcDropdownIn var(--transition-base) ease-out forwards;

    @keyframes fcDropdownIn {
      from { opacity: 0; transform: translateY(6px) scale(0.97); }
      to   { opacity: 1; transform: none; }
    }
  }

  &__dropdown-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: 10px var(--space-3);
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

    svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    &--active {
      font-weight: var(--weight-semibold);
      background: var(--color-neutral-alpha-muted);
    }
  }

  &__tooltip {
    position: absolute;
    bottom: calc(100% + 6px);
    right: 0;
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    font-size: 0.7rem;
    white-space: nowrap;
    padding: 4px var(--space-2);
    border-radius: var(--radius-md);
    pointer-events: none;
    z-index: 10;
  }
}
```

---

## Task 3: Create FeaturedBookCard component

**Files:**
- Create: `src/components/book/cards/FeaturedBookCard.tsx`

- [ ] **Step 1: Create `FeaturedBookCard.tsx`**

```tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { getCoverUrl } from "@/utils/coverImage";
import { useTranslation } from "react-i18next";
import { useShelf } from "@/hooks/useShelf";
import { useAuth } from "@/hooks/useAuth";
import { encodeKey } from "@/utils/bookPaths";
import { genreToI18nKey } from "@/utils/genreUtils";
import { BookOpen, Bookmark, Star } from "lucide-react";
import "./FeaturedBookCard.scss";

const SHELF_OPTIONS: ShelfStatus[] = ["wantToRead", "reading", "finished", "didNotFinish"];

type FeaturedBookCardProps = {
  book: Book;
};

export default function FeaturedBookCard({ book }: FeaturedBookCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const { addBook, removeBook, getStatus } = useShelf();
  const { isAuthenticated } = useAuth();
  const saved = getStatus(book.key);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const handleCardClick = () => {
    navigate(`/books/${encodeKey(book.key)}`, { state: { book } });
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/books/${encodeKey(book.key)}`, { state: { book } });
  };

  const handleSaveBtnClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setTooltipVisible(true);
      setTimeout(() => setTooltipVisible(false), 2000);
      return;
    }
    setDropdownOpen((o) => !o);
  };

  const handleSelect = (e: React.MouseEvent, option: ShelfStatus) => {
    e.stopPropagation();
    if (saved === option) {
      removeBook(book.key);
    } else {
      addBook(book, option);
    }
    setDropdownOpen(false);
  };

  const hasCover = (book.cover_url || book.cover_id) && !coverFailed;
  const coverSrc = book.cover_url ?? (book.cover_id ? getCoverUrl(book.cover_id) : "");
  const genreLabel = book.genre
    ? t(`book.genres.${genreToI18nKey(book.genre)}`, { defaultValue: book.genre })
    : null;

  return (
    <article
      className={`featured-book-card${dropdownOpen ? " featured-book-card--open" : ""}`}
      onClick={handleCardClick}
    >
      <div className="featured-book-card__cover-wrapper">
        {hasCover ? (
          <img
            className="featured-book-card__cover"
            src={coverSrc}
            alt={t("book.coverAlt", { title: book.title })}
            loading="lazy"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="featured-book-card__cover-placeholder">
            <BookOpen strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="featured-book-card__body">
        {(genreLabel || book.pages || book.first_publish_year) && (
          <div className="featured-book-card__meta">
            {genreLabel && (
              <div className="featured-book-card__meta-item">
                <span className="featured-book-card__meta-label">{t("book.meta.genre")}</span>
                <span className="featured-book-card__meta-dot">·</span>
                <span className="featured-book-card__meta-value">{genreLabel}</span>
              </div>
            )}
            {book.pages && (
              <div className="featured-book-card__meta-item">
                <span className="featured-book-card__meta-label">{t("book.meta.pages")}</span>
                <span className="featured-book-card__meta-dot">·</span>
                <span className="featured-book-card__meta-value">{book.pages}</span>
              </div>
            )}
            {book.first_publish_year && (
              <div className="featured-book-card__meta-item">
                <span className="featured-book-card__meta-label">{t("book.meta.year")}</span>
                <span className="featured-book-card__meta-dot">·</span>
                <span className="featured-book-card__meta-value">{book.first_publish_year}</span>
              </div>
            )}
          </div>
        )}

        {book.synopsis && (
          <p className="featured-book-card__synopsis">{book.synopsis}</p>
        )}

        <div className="featured-book-card__text">
          <h3 className="featured-book-card__title">{book.title}</h3>
          <p className="featured-book-card__author">
            {book.authors.length > 0 ? book.authors.join(", ") : t("book.unknownAuthor")}
          </p>
          <div className="featured-book-card__rating">
            <Star className="featured-book-card__star" size={13} fill="currentColor" stroke="none" />
            {(book.rating ?? 0) > 0 ? (
              <>
                <span className="featured-book-card__rating-value">{book.rating!.toFixed(1)}</span>
                {book.ratingCount && (
                  <span className="featured-book-card__rating-count">
                    ({book.ratingCount.toLocaleString()})
                  </span>
                )}
              </>
            ) : (
              <span className="featured-book-card__rating-count">Sin valorar</span>
            )}
          </div>
        </div>

        <div className="featured-book-card__btns">
          <button
            type="button"
            className="featured-book-card__btn featured-book-card__btn--outline"
            onClick={handleViewClick}
          >
            {t("book.viewPage")}
          </button>

          <div className="featured-book-card__save-wrapper" ref={wrapperRef}>
            {tooltipVisible && (
              <span className="featured-book-card__tooltip">{t("explore.saveTooltip")}</span>
            )}
            <button
              type="button"
              className={`featured-book-card__btn featured-book-card__btn--solid${saved && !dropdownOpen ? " featured-book-card__btn--saved" : ""}`}
              onClick={handleSaveBtnClick}
            >
              {saved && !dropdownOpen ? (
                <>
                  <Bookmark size={14} fill="currentColor" stroke="none" />
                  {t("book.saved")}
                </>
              ) : (
                t("book.save")
              )}
            </button>

            {dropdownOpen && (
              <ul
                className="featured-book-card__dropdown"
                onClick={(e) => e.stopPropagation()}
              >
                {SHELF_OPTIONS.map((opt) => (
                  <li key={opt}>
                    <button
                      className={`featured-book-card__dropdown-item${saved === opt ? " featured-book-card__dropdown-item--active" : ""}`}
                      onClick={(e) => handleSelect(e, opt)}
                    >
                      {saved === opt && <Bookmark size={16} />}
                      {t(`myLibrary.shelf.${opt}`)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run build 2>&1 | grep -E "error TS|FeaturedBookCard"
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/book/cards/FeaturedBookCard.tsx src/components/book/cards/FeaturedBookCard.scss
git commit -m "feat(book): add FeaturedBookCard component"
```

---

## Task 4: Update ExploreSection

**Files:**
- Modify: `src/components/explore/ExploreSection.tsx`
- Modify: `src/components/explore/ExploreSection.scss`

- [ ] **Step 1: Add FeaturedBookCard import to ExploreSection.tsx**

After the existing imports (after `import "./ExploreSection.scss";`), add:

```tsx
import FeaturedBookCard from "@/components/book/cards/FeaturedBookCard";
```

- [ ] **Step 2: Add `featured` to the props type**

Change `ExploreSectionProps` from:

```tsx
type ExploreSectionProps = {
  type: ExploreSectionType;
  params?: ExploreSectionParams;
  override?: Pick<SectionEntry, "books" | "isFallback">;  
  titleKey?: string;
  titleFallbackKey?: string;
  titleHighlight?: string;
  onNavigate?: () => void;
};
```

To:

```tsx
type ExploreSectionProps = {
  type: ExploreSectionType;
  params?: ExploreSectionParams;
  override?: Pick<SectionEntry, "books" | "isFallback">;  
  titleKey?: string;
  titleFallbackKey?: string;
  titleHighlight?: string;
  onNavigate?: () => void;
  featured?: boolean;
};
```

- [ ] **Step 3: Destructure `featured` in the function signature**

Change:

```tsx
export default function ExploreSection({
  type,
  params = {},
  override,
  titleKey,
  titleFallbackKey,
  titleHighlight,
  onNavigate,
}: ExploreSectionProps) {
```

To:

```tsx
export default function ExploreSection({
  type,
  params = {},
  override,
  titleKey,
  titleFallbackKey,
  titleHighlight,
  onNavigate,
  featured = false,
}: ExploreSectionProps) {
```

- [ ] **Step 4: Update the grid render block**

Change:

```tsx
      {!loading && !error && books.length > 0 && (
        <div className="explore-section__grid">
          {books.map(book => (
            <BookCard key={book.key} book={book} />
          ))}
        </div>
      )}
```

To:

```tsx
      {!loading && !error && books.length > 0 && (
        <div className={`explore-section__grid${featured ? " explore-section__grid--featured" : ""}`}>
          {featured && <FeaturedBookCard book={books[0]} />}
          {(featured ? books.slice(1) : books).map(book => (
            <BookCard key={book.key} book={book} />
          ))}
        </div>
      )}
```

- [ ] **Step 5: Add `--featured` modifier to ExploreSection.scss**

After the closing `}` of `&__grid` (after line 63), before `&__error`, add:

```scss
  &__grid--featured {
    align-items: stretch;

    .featured-book-card {
      grid-column: 1 / -1;
    }

    @include from($bp-md) {
      .featured-book-card {
        grid-column: span 4;
      }
    }

    @include from($bp-lg) {
      .featured-book-card {
        grid-column: span 3;
      }
    }
  }
```

- [ ] **Step 6: Type-check**

```bash
npm run build 2>&1 | grep -E "error TS|ExploreSection"
```

Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/explore/ExploreSection.tsx src/components/explore/ExploreSection.scss
git commit -m "feat(explore): add featured prop to ExploreSection for FeaturedBookCard"
```

---

## Task 5: Wire up in ExplorePage and verify

**Files:**
- Modify: `src/pages/explore/ExplorePage.tsx`

- [ ] **Step 1: Pass `featured` prop for because-reading entries**

In the `sectionsResult.sections.map` render (around line 268), change:

```tsx
                  ) : (
                    <ExploreSection
                      type={entry.type}
                      override={{ books: entry.books, isFallback: entry.isFallback }}
                      params={buildParamsForEntry(entry, shelfDerived!)}
                      titleKey={titleKeyForEntry(entry)}
                      titleFallbackKey={entry.type === "new-releases-for-you" ? "explore.sections.newReleasesFallback" : undefined}
                      titleHighlight={titleHighlightForEntry(entry)}
                      onNavigate={handleNavigateToSection}
                    />
```

To:

```tsx
                  ) : (
                    <ExploreSection
                      type={entry.type}
                      override={{ books: entry.books, isFallback: entry.isFallback }}
                      params={buildParamsForEntry(entry, shelfDerived!)}
                      titleKey={titleKeyForEntry(entry)}
                      titleFallbackKey={entry.type === "new-releases-for-you" ? "explore.sections.newReleasesFallback" : undefined}
                      titleHighlight={titleHighlightForEntry(entry)}
                      onNavigate={handleNavigateToSection}
                      featured={entry.type === "because-reading"}
                    />
```

- [ ] **Step 2: Start dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:5173`. Log in with an account that has finished/reading books in the shelf (this is required for "because-reading" sections to appear). Navigate to Explore and verify:

1. The "porque estás leyendo [libro]" section shows the first book as a wide horizontal FeaturedBookCard
2. FeaturedBookCard spans ~half the row; 3 regular BookCards fill the other half
3. Cover is left-aligned with 8px padding on all sides and border-radius
4. Body contains: meta bar (Género · Páginas · Año), title/author/rating, and two buttons
5. "Ver página" navigates to `/books/:id`
6. "Guardar" opens the shelf dropdown above the button row; dropdown options work
7. At tablet (resize to 768–1023px): featured card spans the full row; BookCards wrap below
8. At mobile (< 768px): featured card shows cover on top, body below

- [ ] **Step 3: Build and lint**

```bash
npm run build && npm run lint
```

Expected: no errors or warnings.

- [ ] **Step 4: Commit**

```bash
git add src/pages/explore/ExplorePage.tsx
git commit -m "feat(explore): apply FeaturedBookCard to because-reading sections"
```
