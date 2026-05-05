# Full Shelf Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear la página `/my-library/shelf` con todos los libros de la estantería del usuario, buscable y filtrable por estado, accesible desde el botón "Ver todo" en ShelfSection (MyLibraryPage y ProfilePage propia).

**Architecture:** Nueva página `FullShelfPage` que lee de `ShelfContext` (ya cargado, sin nueva petición a Firestore). `ShelfSection` recibe una prop `onSeeAll` opcional para navegar a esa página. El perfil público no muestra "Ver todo" (readOnly).

**Tech Stack:** React 19, TypeScript, SCSS BEM, react-router, react-i18next, ShelfContext.

---

## File Map

| Acción | Archivo |
|--------|---------|
| Crear | `src/pages/my-library/shelf/FullShelfPage.tsx` |
| Crear | `src/pages/my-library/shelf/FullShelfPage.scss` |
| Modificar | `src/components/shelf/sections/ShelfSection.tsx` — añadir prop `onSeeAll`, conectar botón |
| Modificar | `src/components/shelf/sections/ShelfSection.scss` — sin cambios de layout, solo asegurar que el enlace sea `button` |
| Modificar | `src/pages/my-library/MyLibraryPage.tsx` — pasar `onSeeAll` a ShelfSection |
| Modificar | `src/pages/profile/ProfilePage.tsx` — pasar `onSeeAll` solo para perfil propio |
| Modificar | `src/routes/routes.tsx` — añadir ruta `/my-library/shelf` |
| Modificar | `src/plugins/i18n/locales/es/myLibrary.json` — añadir claves |
| Modificar | `src/plugins/i18n/locales/en/myLibrary.json` — añadir claves |

---

### Task 1: i18n — añadir claves de traducción

**Files:**
- Modify: `src/plugins/i18n/locales/es/myLibrary.json`
- Modify: `src/plugins/i18n/locales/en/myLibrary.json`

- [ ] **Step 1: Añadir claves al archivo ES**

En `src/plugins/i18n/locales/es/myLibrary.json`, dentro del objeto `"myLibrary"`, añadir tras `"seeAll"`:

```json
"hide": "Ocultar",
"searchPlaceholder": "Busca por título o autor",
"resultsCount": "{{count}} resultado",
"resultsCount_other": "{{count}} resultados",
"noResults": "Sin resultados",
"clearSearch": "Ocultar búsqueda",
```

- [ ] **Step 2: Añadir claves al archivo EN**

En `src/plugins/i18n/locales/en/myLibrary.json`, dentro del objeto `"myLibrary"`, añadir tras `"seeAll"`:

```json
"hide": "Hide",
"searchPlaceholder": "Search by title or author",
"resultsCount": "{{count}} result",
"resultsCount_other": "{{count}} results",
"noResults": "No results",
"clearSearch": "Hide search",
```

- [ ] **Step 3: Verificar build**

```bash
npm run build 2>&1 | grep -v AuthForm | grep error
```

Expected: sin output (sin errores nuevos).

- [ ] **Step 4: Commit**

```bash
git add src/plugins/i18n/locales/es/myLibrary.json src/plugins/i18n/locales/en/myLibrary.json
git commit -m "feat(shelf): i18n keys for full shelf page"
```

---

### Task 2: Crear FullShelfPage

**Files:**
- Create: `src/pages/my-library/shelf/FullShelfPage.tsx`
- Create: `src/pages/my-library/shelf/FullShelfPage.scss`

- [ ] **Step 1: Crear FullShelfPage.tsx**

```tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useShelf } from "@/hooks/useShelf";
import { getCoverUrl } from "@/utils/coverImage";
import { encodeKey } from "@/utils/bookPaths";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import "./FullShelfPage.scss";

const SHELF_STATUSES: ShelfStatus[] = ["wantToRead", "reading", "finished", "didNotFinish"];
const SKELETON_COUNT = 14;

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function BookCard({ book }: { book: Book }) {
  const navigate = useNavigate();
  const coverSrc = book.cover_url ?? (book.cover_id ? getCoverUrl(book.cover_id) : null);

  return (
    <div
      className="full-shelf__book"
      onClick={() => navigate(`/books/${encodeKey(book.key)}`, { state: { book } })}
    >
      <div className="full-shelf__cover-wrap">
        {coverSrc ? (
          <img className="full-shelf__cover" src={coverSrc} alt={book.title} loading="lazy" />
        ) : (
          <div className="full-shelf__cover-placeholder" />
        )}
      </div>
      <p className="full-shelf__title">{book.title}</p>
      <p className="full-shelf__author">{book.authors.join(", ")}</p>
    </div>
  );
}

export default function FullShelfPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shelfByStatus, loading } = useShelf();
  const [activeStatus, setActiveStatus] = useState<ShelfStatus>("wantToRead");
  const [searchQuery, setSearchQuery] = useState("");

  const isSearching = searchQuery.trim().length > 0;

  const allBooks: Book[] = SHELF_STATUSES.flatMap(s => shelfByStatus[s]);

  const displayBooks = isSearching
    ? allBooks.filter(b => {
        const q = searchQuery.toLowerCase();
        return b.title.toLowerCase().includes(q) || b.authors.some(a => a.toLowerCase().includes(q));
      })
    : shelfByStatus[activeStatus];

  function handleStatusChange(status: ShelfStatus) {
    setActiveStatus(status);
    setSearchQuery("");
  }

  function clearSearch() {
    setSearchQuery("");
  }

  return (
    <main className="full-shelf">

      <div className="full-shelf__header">
        <h1 className="full-shelf__page-title">{t("myLibrary.shelfTitle")}</h1>
        <button className="full-shelf__hide-btn" onClick={() => navigate(-1)}>
          {t("myLibrary.hide")}
        </button>
      </div>

      <div className="full-shelf__tools">
        <div className="full-shelf__filter-tabs">
          {SHELF_STATUSES.map(status => (
            <button
              key={status}
              className={`full-shelf__filter-tab${!isSearching && activeStatus === status ? " full-shelf__filter-tab--active" : ""}`}
              onClick={() => handleStatusChange(status)}
            >
              {t(`myLibrary.shelf.${status}`)}
              <span className="full-shelf__filter-count">{shelfByStatus[status].length}</span>
            </button>
          ))}
        </div>

        <div className="full-shelf__search-bar">
          <span className="full-shelf__search-icon"><SearchIcon /></span>
          <span className="full-shelf__search-divider" />
          <input
            type="text"
            placeholder={t("myLibrary.searchPlaceholder")}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {isSearching && (
            <button className="full-shelf__clear-btn" onClick={clearSearch} aria-label={t("myLibrary.clearSearch")}>
              <CloseIcon />
            </button>
          )}
        </div>

        <button className="full-shelf__filter-btn" disabled aria-label="Filtros">
          <FilterIcon />
        </button>
      </div>

      {isSearching && (
        <div className="full-shelf__results-header">
          <p className="full-shelf__results-count">
            {t("myLibrary.resultsCount", { count: displayBooks.length })}
            {" "}&ldquo;{searchQuery}&rdquo;
          </p>
          <button className="full-shelf__hide-search" onClick={clearSearch}>
            {t("myLibrary.clearSearch")}
          </button>
        </div>
      )}

      {loading && !isSearching ? (
        <div className="full-shelf__grid">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="full-shelf__book-skeleton">
              <div className="full-shelf__skeleton-cover" />
              <div className="full-shelf__skeleton-title" />
              <div className="full-shelf__skeleton-author" />
            </div>
          ))}
        </div>
      ) : (
        <div className="full-shelf__grid">
          {displayBooks.map(book => (
            <BookCard key={book.key} book={book} />
          ))}
          {displayBooks.length === 0 && (
            <p className="full-shelf__empty">{t("myLibrary.noResults")}</p>
          )}
        </div>
      )}

    </main>
  );
}
```

- [ ] **Step 2: Crear FullShelfPage.scss**

Replicar el diseño exacto de `EstanteriaCompleta.module.css` del repo de pruebas adaptado a BEM y tokens del proyecto:

```scss
@use '../../../styles/lib' as *;

.full-shelf {
  @include container;
  padding-top: var(--space-6);
  padding-bottom: var(--space-16);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);

  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  &__page-title {
    font-size: clamp(var(--text-2xl), 4vw, 36px);
    font-weight: var(--weight-extrabold);
    color: var(--color-text-primary);
    letter-spacing: -0.02em;
    margin: 0;
  }

  &__hide-btn {
    background: none;
    border: none;
    font-size: var(--text-base);
    font-weight: var(--weight-bold);
    color: var(--color-brand-primary);
    cursor: pointer;
    padding: 4px 0;
    transition: opacity var(--transition-fast);

    &:hover { opacity: 0.7; }
  }

  // ── Tools bar ──────────────────────────────────────
  &__tools {
    display: flex;
    align-items: center;
    gap: var(--space-3);

    @include until($bp-md) {
      flex-wrap: wrap;
    }
  }

  &__filter-tabs {
    display: inline-flex;
    gap: var(--space-2);
    background: var(--color-bg-card);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    padding: 6px 8px;
    backdrop-filter: blur(8px);
    box-shadow: var(--shadow-card);
    flex-shrink: 0;

    @include until($bp-md) {
      order: 1;
      width: 100%;
      flex-wrap: wrap;
    }
  }

  &__filter-tab {
    padding: 7px 18px;
    border-radius: var(--radius-pill);
    border: 1.5px solid transparent;
    background: transparent;
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    cursor: pointer;
    white-space: nowrap;
    transition: all var(--transition-fast);

    &:hover {
      border-color: var(--color-brand-primary);
      background: var(--color-brand-alpha-subtle);
    }

    &--active {
      border-color: var(--color-brand-primary);

      &:hover {
        background: transparent;
        cursor: default;
      }
    }
  }

  &__filter-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    margin-left: var(--space-1);
    border-radius: var(--radius-pill);
    background: var(--color-neutral-alpha-muted);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    line-height: 1;
    transition: background var(--transition-fast);

    .full-shelf__filter-tab--active & {
      background: var(--color-neutral-alpha-medium);
    }
  }

  &__search-bar {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 0 14px 0 0;
    border: 1.5px solid var(--color-border-medium);
    border-radius: var(--radius-lg);
    background: var(--color-bg-card-solid);
    box-shadow: 0 2px 12px rgba(44, 36, 32, 0.06);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

    &:focus-within {
      border-color: var(--color-brand-primary);
      box-shadow: 0 0 0 3px var(--color-brand-alpha-subtle), 0 2px 12px rgba(44, 36, 32, 0.06);
    }

    @include until($bp-md) {
      order: 2;
      flex: 1;
    }

    input {
      flex: 1;
      border: none;
      outline: none;
      font-size: var(--text-sm);
      color: var(--color-text-primary);
      background: transparent;
      padding: 12px 0;

      &::placeholder { color: var(--color-text-tertiary); }
    }
  }

  &__search-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    height: 44px;
    flex-shrink: 0;
    color: var(--color-text-tertiary);
    transition: color var(--transition-fast);

    svg { width: 16px; height: 16px; }

    .full-shelf__search-bar:focus-within & {
      color: var(--color-brand-primary);
    }
  }

  &__search-divider {
    width: 1px;
    height: 18px;
    background: var(--color-border-medium);
    flex-shrink: 0;
    margin-right: var(--space-3);
  }

  &__clear-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    border: none;
    background: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    padding: 0;
    border-radius: var(--radius-pill);
    transition: color var(--transition-fast), background var(--transition-fast);

    svg { width: 13px; height: 13px; }

    &:hover {
      color: var(--color-text-primary);
      background: var(--color-brand-alpha-subtle);
    }
  }

  &__filter-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    border-radius: var(--radius-lg);
    border: 1.5px solid var(--color-border-medium);
    background: var(--color-bg-card-solid);
    color: var(--color-text-tertiary);
    cursor: not-allowed;
    opacity: 0.45;

    svg { width: 18px; height: 18px; }

    @include until($bp-md) {
      order: 3;
    }
  }

  // ── Results header ──────────────────────────────────
  &__results-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  &__results-count {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    font-weight: var(--weight-medium);
    margin: 0;
  }

  &__hide-search {
    background: none;
    border: none;
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: transparent;
    transition: color var(--transition-fast), text-decoration-color var(--transition-fast);

    &:hover {
      color: var(--color-brand-primary);
      text-decoration-color: var(--color-brand-primary);
    }
  }

  // ── Grid ───────────────────────────────────────────
  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
    gap: 24px 16px;

    @include until($bp-md) {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 16px 12px;
    }

    @media (max-width: 640px) {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 14px 10px;
    }
  }

  &__book {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    cursor: pointer;
  }

  &__cover-wrap {
    width: 100%;
    aspect-ratio: 2 / 3;
  }

  &__cover {
    width: 100%;
    height: 100%;
    border-radius: var(--radius-sm);
    object-fit: cover;
    box-shadow: var(--shadow-cover);
    transition: transform var(--transition-base), box-shadow var(--transition-base);
    display: block;

    .full-shelf__book:hover & {
      transform: translateY(-4px);
      box-shadow: var(--shadow-book);
    }
  }

  &__cover-placeholder {
    width: 100%;
    height: 100%;
    border-radius: var(--radius-sm);
    background: var(--color-border-subtle);
  }

  &__title {
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    line-height: 1.25;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
  }

  &__author {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
  }

  &__empty {
    grid-column: 1 / -1;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0;
    padding: var(--space-8) 0;
    text-align: center;
  }

  // ── Skeleton ────────────────────────────────────────
  &__book-skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  &__skeleton-cover {
    width: 100%;
    aspect-ratio: 2 / 3;
    border-radius: var(--radius-sm);
    @include shimmer-bg;
  }

  &__skeleton-title {
    height: 14px;
    width: 80%;
    border-radius: var(--radius-sm);
    @include shimmer-bg;
  }

  &__skeleton-author {
    height: 12px;
    width: 55%;
    border-radius: var(--radius-sm);
    @include shimmer-bg;
  }
}
```

- [ ] **Step 3: Verificar que el mixin `shimmer-bg` existe**

```bash
grep -r "shimmer-bg\|shimmer" /Users/taniacanto/Documents/GitHub/Book_Project/src/styles/ --include="*.scss" -l
```

Si no existe `shimmer-bg` como mixin, usar en su lugar el skeleton inline del repo de pruebas:

```scss
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
// Reemplazar @include shimmer-bg; con:
background: linear-gradient(90deg,
  var(--color-border-subtle) 25%,
  var(--color-border-medium) 50%,
  var(--color-border-subtle) 75%
);
background-size: 1200px 100%;
animation: shimmer 1.4s infinite linear;
```

- [ ] **Step 4: Verificar que `@include until($bp-md)` existe**

```bash
grep -r "until\|from" /Users/taniacanto/Documents/GitHub/Book_Project/src/styles/ --include="*.scss" | grep "mixin" | head -5
```

Si solo existe `from()` y no `until()`, reemplazar `@include until($bp-md)` con `@media (max-width: 767px)`.

- [ ] **Step 5: Verificar build**

```bash
npm run build 2>&1 | grep -v AuthForm | grep error
```

Expected: sin output.

- [ ] **Step 6: Commit**

```bash
git add src/pages/my-library/shelf/
git commit -m "feat(shelf): página completa de estantería con búsqueda y filtros"
```

---

### Task 3: Añadir ruta `/my-library/shelf`

**Files:**
- Modify: `src/routes/routes.tsx`

- [ ] **Step 1: Importar FullShelfPage y añadir ruta**

En `src/routes/routes.tsx`:

```tsx
import FullShelfPage from "@/pages/my-library/shelf/FullShelfPage";
```

Dentro del array de rutas, añadir como child de `"/"` junto a la ruta `my-library`:

```tsx
{
  path: "my-library/shelf",
  element: (
    <AuthRoute requireAuth>
      <FullShelfPage />
    </AuthRoute>
  ),
},
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | grep -v AuthForm | grep error
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/routes.tsx
git commit -m "feat(shelf): ruta /my-library/shelf para la estantería completa"
```

---

### Task 4: Conectar "Ver todo" en ShelfSection

**Files:**
- Modify: `src/components/shelf/sections/ShelfSection.tsx`

- [ ] **Step 1: Añadir prop `onSeeAll` al tipo**

En `src/components/shelf/sections/ShelfSection.tsx`, actualizar `ShelfSectionProps`:

```tsx
type ShelfSectionProps = {
  books: Record<ShelfStatus, Book[]>;
  loading?: boolean;
  readOnly?: boolean;
  onSeeAll?: () => void;
};
```

- [ ] **Step 2: Destructurar y usar la prop**

En la firma del componente:

```tsx
export default function ShelfSection({ books, loading = false, readOnly = false, onSeeAll }: ShelfSectionProps) {
```

Localizar el enlace actual (línea ~98-100):

```tsx
<a href="#" className="shelf-section__see-all">
  {t("myLibrary.seeAll")} <ChevronRightSmall />
</a>
```

Reemplazarlo con un `button` que solo se muestra cuando `onSeeAll` está definido:

```tsx
{onSeeAll && (
  <button
    type="button"
    className="shelf-section__see-all"
    onClick={onSeeAll}
  >
    {t("myLibrary.seeAll")} <ChevronRightSmall />
  </button>
)}
```

- [ ] **Step 3: Verificar build**

```bash
npm run build 2>&1 | grep -v AuthForm | grep error
```

- [ ] **Step 4: Commit**

```bash
git add src/components/shelf/sections/ShelfSection.tsx
git commit -m "feat(shelf): prop onSeeAll en ShelfSection para navegar a estantería completa"
```

---

### Task 5: Pasar `onSeeAll` desde MyLibraryPage

**Files:**
- Modify: `src/pages/my-library/MyLibraryPage.tsx`

- [ ] **Step 1: Importar useNavigate y pasar la prop**

En `src/pages/my-library/MyLibraryPage.tsx`:

```tsx
import { useNavigate } from "react-router";
```

Dentro de `MyLibraryPage`:

```tsx
const navigate = useNavigate();
```

Localizar el uso de `<ShelfSection books={shelfByStatus} />` y añadir la prop:

```tsx
<ShelfSection
  books={shelfByStatus}
  onSeeAll={() => navigate("/my-library/shelf")}
/>
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | grep -v AuthForm | grep error
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/my-library/MyLibraryPage.tsx
git commit -m "feat(shelf): conectar Ver todo en MyLibraryPage a /my-library/shelf"
```

---

### Task 6: Pasar `onSeeAll` desde ProfilePage (perfil propio)

**Files:**
- Modify: `src/pages/profile/ProfilePage.tsx`

- [ ] **Step 1: Leer el archivo para entender la estructura actual**

```bash
grep -n "ShelfSection\|isOwnProfile\|useNavigate" src/pages/profile/ProfilePage.tsx
```

- [ ] **Step 2: Añadir `onSeeAll` solo para perfil propio**

Localizar el uso de `<ShelfSection>` en `ProfilePage.tsx`. Actualmente tiene algo como:

```tsx
<ShelfSection
  books={...}
  readOnly={!isOwnProfile}
/>
```

Añadir `onSeeAll` solo cuando es perfil propio:

```tsx
<ShelfSection
  books={...}
  readOnly={!isOwnProfile}
  onSeeAll={isOwnProfile ? () => navigate("/my-library/shelf") : undefined}
/>
```

Asegurarse de que `useNavigate` está importado y usado en el componente.

- [ ] **Step 3: Verificar build**

```bash
npm run build 2>&1 | grep -v AuthForm | grep error
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/profile/ProfilePage.tsx
git commit -m "feat(shelf): conectar Ver todo en ProfilePage propia a /my-library/shelf"
```

---

## Self-Review

**Spec coverage:**
- [x] Página `/my-library/shelf` con todos los libros — Task 2
- [x] Tabs filtro por estado (wantToRead, reading, finished, didNotFinish) — Task 2
- [x] Búsqueda por título y autor — Task 2
- [x] Diseño fiel al repo de pruebas (grid auto-fill, search bar con divider, tabs pill, hover lift) — Task 2
- [x] Skeleton de carga — Task 2
- [x] Accesible desde MyLibraryPage "Ver todo" — Tasks 4+5
- [x] Accesible desde ProfilePage propia "Ver todo" — Tasks 4+6
- [x] Perfil público no muestra "Ver todo" — Task 6 (onSeeAll=undefined)
- [x] Ruta protegida con AuthRoute — Task 3
- [x] i18n ES + EN — Task 1

**Placeholders:** Ninguno. Todo el código está incluido.

**Type consistency:** `ShelfStatus` importado de `@/types/BookDetail`, `Book` de `@/types/Book`, consistente con el resto del proyecto.
