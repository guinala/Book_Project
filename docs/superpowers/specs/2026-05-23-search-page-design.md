# Search Page Design

**Date:** 2026-05-23
**Status:** Approved

## Problem

The Navbar already navigates to `/search?q=...` on Enter, but `SearchPage` returns `null`. The route exists; the component was never built.

## Scope

Build `SearchPage` to display book search results. No filter tabs in this iteration.

## User Flow

1. User types in the Navbar search input and presses Enter.
2. Browser navigates to `/search?q=<query>`.
3. SearchPage reads `q` from the URL, pre-fills its own search bar, and fires the search.
4. Results appear in a book grid.
5. User can refine the search using the page's own search bar — submit navigates to `/search?q=newquery`, updating the URL and triggering a new search.

## Architecture

### Data flow

```
URL ?q=  →  useEffect(q)  →  fetchBooks(q, "todo")  →  books[]  →  BookCard grid
     ↑
SearchBar submit → navigate(/search?q=nuevo)
```

### Components used

| Component | Source | Role |
|-----------|--------|------|
| `useBookSearch` | `@/hooks/useBookSearch` | Fetches books (Firestore cache → OpenLibrary API) |
| `BookCard` | `@/components/book/cards/BookCard` | Renders each result |
| `SearchPage` | `@/pages/search/SearchPage.tsx` | New — only component to write |

`Searchbar.tsx` (`@/components/common/Searchbar.tsx`) is not reused here because it renders a title and is styled for the Explore page. The SearchPage will have its own inline input following the existing `.search-page` SCSS class structure.

### URL as source of truth

- `q` param drives the search. Every submission updates the URL via `navigate`.
- `useEffect` depends on `q` — changing the URL triggers a new fetch automatically.
- Back/Forward browser navigation works between searches.
- URLs are shareable.

## Layout

```
[ search input pre-filled with q          [x] ]

  "X resultados para 'query'"

[ BookCard ][ BookCard ][ BookCard ][ BookCard ]
[ BookCard ][ BookCard ][ BookCard ][ BookCard ]
```

Grid: 2 cols mobile → 4 cols tablet (768px) → 6 cols desktop (1024px).
Uses existing `.search-page__grid` styles from `SearchPage.scss`.

## States

| State | Condition | Display |
|-------|-----------|---------|
| Empty | No `q` param | Blank / search prompt |
| Loading | `loading === true` | Text "Buscando..." |
| Results | `books.length > 0` | BookCard grid + count label |
| No results | `books.length === 0` && !loading | "No encontramos resultados para 'query'" |
| Error | `error !== null` | Error message string |

## i18n

Translations already exist:
- `explore.searching` — "Buscando..."
- `explore.resultsFound` — "{{count}} resultados encontrados"
- `explore.resultsTitle` — `Resultados para "{{query}}"`

New keys to add (both `es` and `en`):
- `search.noResults` — "No encontramos resultados para '{{query}}'"
- `search.emptyPrompt` — "Escribe algo para buscar libros"

## Out of scope

- Filter tabs (todo / titulo / autor / isbn) — future iteration
- Pagination / infinite scroll — future iteration
- Skeleton loaders — future iteration
