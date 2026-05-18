# Book Detail Skeleton Loading — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los textos de carga de `BookDetailPage` con skeleton shimmer que replica fielmente el layout de cada sección.

**Architecture:** Dos componentes nuevos (`BookInfoCardSkeleton`, `AuthorSectionSkeleton`) colocados junto a sus homólogos reales en `src/components/book/info/`. Cada skeleton replica las dimensiones y estructura del componente real para evitar saltos de layout. `BookDetailPage` los consume directamente en sus dos estados de carga.

**Tech Stack:** React 19, TypeScript, SCSS con BEM, `@include shimmer-bg` de `src/styles/lib/_mixins.scss`

> **Nota:** No hay suite de tests en este proyecto (`npm test` no existe). La verificación se hace con `npm run lint` + `npm run build` + inspección visual en el servidor de dev.

---

## File Map

| Acción   | Archivo |
|----------|---------|
| Crear    | `src/components/book/info/BookInfoCardSkeleton.tsx` |
| Crear    | `src/components/book/info/BookInfoCardSkeleton.scss` |
| Crear    | `src/components/book/info/AuthorSectionSkeleton.tsx` |
| Crear    | `src/components/book/info/AuthorSectionSkeleton.scss` |
| Modificar | `src/pages/book-detail/BookDetailPage.tsx` |

---

## Task 1: BookInfoCardSkeleton

**Files:**
- Create: `src/components/book/info/BookInfoCardSkeleton.tsx`
- Create: `src/components/book/info/BookInfoCardSkeleton.scss`

- [ ] **Step 1: Crear el componente TSX**

Crear `src/components/book/info/BookInfoCardSkeleton.tsx` con este contenido:

```tsx
import "./BookInfoCardSkeleton.scss";

export default function BookInfoCardSkeleton() {
  return (
    <div className="book-info-card-skeleton">
      <div className="book-info-card-skeleton__cover" />
      <div className="book-info-card-skeleton__details">
        <div className="book-info-card-skeleton__line book-info-card-skeleton__line--genre" />
        <div className="book-info-card-skeleton__line book-info-card-skeleton__line--title" />
        <div className="book-info-card-skeleton__line book-info-card-skeleton__line--author" />
        <div className="book-info-card-skeleton__info-row" />
        <div className="book-info-card-skeleton__synopsis" />
        <div className="book-info-card-skeleton__footer">
          <div className="book-info-card-skeleton__button" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear el SCSS**

Crear `src/components/book/info/BookInfoCardSkeleton.scss` con este contenido:

```scss
@use "../../../styles/shared" as *;

%shimmer {
  background: linear-gradient(
    90deg,
    var(--color-neutral-alpha-muted) 25%,
    var(--color-border-subtle) 50%,
    var(--color-neutral-alpha-muted) 75%
  );
  @include shimmer-bg;
  border-radius: var(--radius-sm);
}

.book-info-card-skeleton {
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-outline);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;

  @include from($bp-md) {
    flex-direction: row;
    gap: var(--space-6);
  }

  &__cover {
    @extend %shimmer;
    width: 100%;
    height: 300px;
    flex-shrink: 0;
    border-radius: var(--radius-md);

    @include from($bp-md) {
      width: 250px;
      height: auto;
      min-height: 375px;
      align-self: stretch;
    }
  }

  &__details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 0;

    @include from($bp-md) {
      padding-right: 52px;
    }
  }

  &__line {
    @extend %shimmer;
    height: 12px;

    &--genre  { width: 80px; }
    &--title  { width: 70%; height: 22px; }
    &--author { width: 40%; }
  }

  &__info-row {
    @extend %shimmer;
    height: 48px;
    border-radius: var(--radius-sm);
  }

  &__synopsis {
    @extend %shimmer;
    height: 170px;
    border-radius: var(--radius-md);
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    margin-top: var(--space-1);
  }

  &__button {
    @extend %shimmer;
    width: 140px;
    height: 38px;
    border-radius: var(--radius-sm);
  }
}
```

- [ ] **Step 3: Verificar lint y build**

```bash
npm run lint && npm run build
```

Esperado: sin errores. Si hay un warning de SCSS sobre `@extend` fuera del selector raíz, es inofensivo.

- [ ] **Step 4: Commit**

```bash
git add src/components/book/info/BookInfoCardSkeleton.tsx src/components/book/info/BookInfoCardSkeleton.scss
git commit -m "feat(book-detail): add BookInfoCardSkeleton component"
```

---

## Task 2: AuthorSectionSkeleton

**Files:**
- Create: `src/components/book/info/AuthorSectionSkeleton.tsx`
- Create: `src/components/book/info/AuthorSectionSkeleton.scss`

- [ ] **Step 1: Crear el componente TSX**

Crear `src/components/book/info/AuthorSectionSkeleton.tsx` con este contenido:

```tsx
import "./AuthorSectionSkeleton.scss";

export default function AuthorSectionSkeleton() {
  return (
    <section className="author-section-skeleton">
      <div className="author-section-skeleton__title" />
      <div className="author-section-skeleton__card">
        <div className="author-section-skeleton__photo" />
        <div className="author-section-skeleton__info">
          <div className="author-section-skeleton__name" />
          <div className="author-section-skeleton__bio" />
        </div>
      </div>
      <div className="author-section-skeleton__books-row">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="author-section-skeleton__book">
            <div className="author-section-skeleton__book-cover" />
            <div className="author-section-skeleton__book-line author-section-skeleton__book-line--title" />
            <div className="author-section-skeleton__book-line author-section-skeleton__book-line--year" />
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Crear el SCSS**

Crear `src/components/book/info/AuthorSectionSkeleton.scss` con este contenido.

El posicionamiento de la foto replica exactamente al de `AuthorSection`: absoluto con `top: -44px` en móvil y `top: -32px, left: -20px` en desktop.

```scss
@use "../../../styles/shared" as *;

%shimmer {
  background: linear-gradient(
    90deg,
    var(--color-neutral-alpha-muted) 25%,
    var(--color-border-subtle) 50%,
    var(--color-neutral-alpha-muted) 75%
  );
  @include shimmer-bg;
  border-radius: var(--radius-sm);
}

.author-section-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &__title {
    @extend %shimmer;
    height: 28px;
    width: 180px;
  }

  &__card {
    background: transparent;
    border: 1px solid var(--color-border-outline);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
    position: relative;
    padding: 90px 20px 24px;
    min-height: 130px;
    margin-top: var(--space-12);

    @include from($bp-md) {
      padding: 20px var(--space-7) var(--space-7) 148px;
      margin-top: var(--space-8);
    }
  }

  &__photo {
    @extend %shimmer;
    position: absolute;
    top: -44px;
    left: 50%;
    transform: translateX(-50%);
    width: 130px;
    height: 130px;
    border-radius: var(--radius-pill);

    @include from($bp-md) {
      top: -32px;
      left: -20px;
      transform: none;
    }
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__name {
    @extend %shimmer;
    height: 26px;
    width: 200px;
  }

  &__bio {
    @extend %shimmer;
    height: 90px;
    border-radius: var(--radius-md);
  }

  &__books-row {
    display: flex;
    gap: var(--space-6);
    flex-wrap: wrap;
    padding: var(--space-4) 0 var(--space-1);
  }

  &__book {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    flex: 0 0 145px;
    min-width: 0;
  }

  &__book-cover {
    @extend %shimmer;
    width: 100%;
    aspect-ratio: 2 / 3;
    border-radius: var(--radius-sm);
  }

  &__book-line {
    @extend %shimmer;
    height: 11px;

    &--title { width: 85%; }
    &--year  { width: 40%; }
  }
}
```

- [ ] **Step 3: Verificar lint y build**

```bash
npm run lint && npm run build
```

Esperado: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/book/info/AuthorSectionSkeleton.tsx src/components/book/info/AuthorSectionSkeleton.scss
git commit -m "feat(book-detail): add AuthorSectionSkeleton component"
```

---

## Task 3: Integrar los skeletons en BookDetailPage

**Files:**
- Modify: `src/pages/book-detail/BookDetailPage.tsx`

- [ ] **Step 1: Añadir los imports**

En `src/pages/book-detail/BookDetailPage.tsx`, añadir después de los imports existentes de componentes:

```tsx
import BookInfoCardSkeleton from "@/components/book/info/BookInfoCardSkeleton";
import AuthorSectionSkeleton from "@/components/book/info/AuthorSectionSkeleton";
```

- [ ] **Step 2: Reemplazar el loading state del libro**

Localizar el bloque actual (líneas ~34-40):

```tsx
if (loading) {
  return (
    <div className="book-detail-page">
      <p className="book-detail-page__status">{t("bookDetail.loading")}</p>
    </div>
  );
}
```

Reemplazarlo por:

```tsx
if (loading) {
  return (
    <div className="book-detail-page">
      <section className="book-detail-page__info-section">
        <BookInfoCardSkeleton />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Reemplazar el loading state del autor**

Localizar el bloque inline (líneas ~69-72):

```tsx
{authorLoading
  ? <p className="book-detail-page__status">{t("bookDetail.loading")}</p>
  : <AuthorSection authorInfo={authorInfo ?? book.authorInfo} />
}
```

Reemplazarlo por:

```tsx
{authorLoading
  ? <AuthorSectionSkeleton />
  : <AuthorSection authorInfo={authorInfo ?? book.authorInfo} />
}
```

- [ ] **Step 4: Verificar lint y build**

```bash
npm run lint && npm run build
```

Esperado: sin errores de tipo ni de lint.

- [ ] **Step 5: Commit**

```bash
git add src/pages/book-detail/BookDetailPage.tsx
git commit -m "feat(book-detail): replace loading text with skeleton components"
```

---

## Task 4: Verificación visual

- [ ] **Step 1: Arrancar el servidor de dev**

```bash
npm run dev
```

- [ ] **Step 2: Verificar BookInfoCardSkeleton**

Abrir en el navegador una URL de detalle de libro, por ejemplo `/books/OL45804W`. En el momento de la carga inicial, debe aparecer el skeleton del card (portada + líneas shimmer + rectángulo de sinopsis + botón). No debe aparecer texto "Cargando...".

Comprobar también en vista móvil (< 768px): la portada ocupa el ancho completo y tiene 300px de alto.

- [ ] **Step 3: Verificar AuthorSectionSkeleton**

En la misma página, una vez que el libro cargó pero el autor todavía no, debe aparecer el skeleton de la sección de autor (título + card con círculo + fila de libros). La foto circular debe estar posicionada fuera del borde superior del card, igual que la foto real.

- [ ] **Step 4: Verificar tema oscuro**

Cambiar al tema oscuro desde ajustes y repetir la carga. Los shimmer deben verse correctamente con los tokens de dark theme (`--color-neutral-alpha-muted`, `--color-border-subtle`).
