# Search Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `SearchPage` so the navbar search bar navigates to `/search?q=...` and displays book results.

**Architecture:** URL query param `?q=` is the source of truth. A `useEffect` triggers `useBookSearch.fetchBooks` whenever `q` changes. The page owns its own search input pre-filled from the URL; submitting it navigates to `/search?q=newterm`, which re-triggers the fetch. All states (loading, results, no-results, error, empty) are rendered inline.

**Tech Stack:** React 19, TypeScript, react-router `useSearchParams` + `useNavigate`, `useBookSearch` hook, `BookCard` component, SCSS BEM.

---

## Files

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/plugins/i18n/locales/es/explore.json` | Add `search.noResults` and `search.emptyPrompt` keys |
| Modify | `src/plugins/i18n/locales/en/explore.json` | Same, in English |
| Modify | `src/pages/search/SearchPage.scss` | Add search input block styles |
| Modify | `src/pages/search/SearchPage.tsx` | Replace `return null` with full implementation |

---

### Task 1: Add i18n keys

**Files:**
- Modify: `src/plugins/i18n/locales/es/explore.json`
- Modify: `src/plugins/i18n/locales/en/explore.json`

- [ ] **Step 1: Add keys to Spanish locale**

In `src/plugins/i18n/locales/es/explore.json`, add two keys inside the existing `"search"` object (after `"searchBtnLabel"`):

```json
"noResults": "No encontramos resultados para \"{{query}}\"",
"emptyPrompt": "Escribe algo para buscar libros"
```

The `"search"` block should end up as:

```json
"search": {
  "all": "Todo",
  "title": "Título",
  "author": "Autor",
  "isbn": "ISBN",
  "searchLabel": "Buscar Libros",
  "clearLabel": "Borrar Búsqueda",
  "searchBtnLabel": "Buscar",
  "noResults": "No encontramos resultados para \"{{query}}\"",
  "emptyPrompt": "Escribe algo para buscar libros"
}
```

- [ ] **Step 2: Add keys to English locale**

In `src/plugins/i18n/locales/en/explore.json`, same location:

```json
"noResults": "No results found for \"{{query}}\"",
"emptyPrompt": "Type something to search for books"
```

The `"search"` block should end up as:

```json
"search": {
  "all": "All",
  "title": "Title",
  "author": "Author",
  "isbn": "ISBN",
  "searchLabel": "Search books",
  "clearLabel": "Clear search",
  "searchBtnLabel": "Search",
  "noResults": "No results found for \"{{query}}\"",
  "emptyPrompt": "Type something to search for books"
}
```

- [ ] **Step 3: Commit**

```bash
git add src/plugins/i18n/locales/es/explore.json src/plugins/i18n/locales/en/explore.json
git commit -m "feat(i18n): add search page translation keys"
```

---

### Task 2: Add search input styles to SearchPage.scss

**Files:**
- Modify: `src/pages/search/SearchPage.scss`

- [ ] **Step 1: Add search bar block**

Append the following block inside the `.search-page` rule, after the existing `&__no-results-img` block (before the closing `}`):

```scss
  &__search-wrap {
    padding-bottom: var(--space-6);

    @include from($bp-md) {
      padding-bottom: var(--space-8);
    }
  }

  &__search-form {
    display: flex;
    align-items: center;
    width: 100%;
    max-width: 560px;
    height: 44px;
    border: 1.5px solid var(--color-border-medium);
    border-radius: var(--radius-lg);
    background: var(--color-bg-page);
    transition: border-color var(--transition-fast);
    overflow: hidden;

    &:focus-within {
      border-color: var(--color-text-primary);
    }
  }

  &__search-icon {
    flex-shrink: 0;
    padding: 0 var(--space-3);
    color: var(--color-text-tertiary);
    pointer-events: none;

    .search-page__search-form:focus-within & {
      color: var(--color-text-primary);
    }
  }

  &__search-input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    outline: none;
    padding: 0 var(--space-2);
    height: 100%;
    font-size: var(--text-sm);
    font-family: var(--font-main);
    color: var(--color-text-primary);

    &::placeholder {
      color: var(--color-text-subtle);
    }

    &::-webkit-search-cancel-button {
      display: none;
    }
  }

  &__search-clear {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin-right: var(--space-2);
    flex-shrink: 0;
    border: none;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--color-text-tertiary);
    cursor: pointer;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--color-text-primary);
    }
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/search/SearchPage.scss
git commit -m "feat(search): add search input styles to SearchPage"
```

---

### Task 3: Build SearchPage component

**Files:**
- Modify: `src/pages/search/SearchPage.tsx`

- [ ] **Step 1: Replace the component**

Replace the entire file with:

```tsx
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useBookSearch } from "@/hooks/useBookSearch";
import BookCard from "@/components/book/cards/BookCard";
import { Search, X } from "lucide-react";
import "./SearchPage.scss";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const q = searchParams.get("q") ?? "";

  const [inputValue, setInputValue] = useState(q);
  const inputRef = useRef<HTMLInputElement>(null);
  const { books, loading, error, totalResults, fetchBooks, resetBookResults } = useBookSearch();

  useEffect(() => {
    setInputValue(q);
  }, [q]);

  useEffect(() => {
    if (q.trim()) {
      fetchBooks(q.trim(), "todo");
    } else {
      resetBookResults();
    }
  }, [q, fetchBooks, resetBookResults]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const showNoResults = !loading && !error && q.trim() !== "" && books.length === 0;

  return (
    <div className="search-page">
      <div className="search-page__search-wrap">
        <form className="search-page__search-form" onSubmit={handleSubmit} role="search">
          <Search size={18} className="search-page__search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            className="search-page__search-input"
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t("navbar.search")}
            aria-label={t("search.searchLabel")}
          />
          {inputValue && (
            <button
              type="button"
              className="search-page__search-clear"
              aria-label={t("search.clearLabel")}
              onMouseDown={(e) => {
                e.preventDefault();
                setInputValue("");
                inputRef.current?.focus();
              }}
            >
              <X size={14} />
            </button>
          )}
        </form>
      </div>

      <div className="search-page__results">
        {!q.trim() && (
          <p className="search-page__status">{t("search.emptyPrompt")}</p>
        )}

        {loading && (
          <p className="search-page__status">{t("explore.searching")}</p>
        )}

        {error && !loading && (
          <p className="search-page__error">{error}</p>
        )}

        {showNoResults && (
          <div className="search-page__no-results">
            <p className="search-page__no-results-title">
              {t("search.noResults", { query: q })}
            </p>
          </div>
        )}

        {!loading && books.length > 0 && (
          <>
            <p className="search-page__status">
              {t("explore.resultsFound", { count: totalResults })}
            </p>
            <div className="search-page__grid">
              {books.map((book) => (
                <BookCard key={book.key} book={book} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/pages/search/SearchPage.tsx
git commit -m "feat(search): implement SearchPage with URL-driven search"
```
