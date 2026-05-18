# Book Detail Page — Skeleton Loading

**Fecha:** 2026-05-18

## Contexto

La página `/books/:bookId` tiene dos momentos de carga distintos:
1. El libro principal (`loading` en `useBookDetail`) — bloquea título, portada, sinopsis, rating, etc.
2. El autor (`authorLoading` en `useAuthorData`) — carga en paralelo una vez disponible el `book.author`.

Actualmente ambos estados muestran texto plano (`t("bookDetail.loading")`). Esta spec añade skeleton shimmer para cada uno, siguiendo el patrón ya establecido en `ExploreGridSkeleton`.

## Decisiones de diseño

- **Granularidad**: dos componentes separados, uno por sección. Permite que el libro aparezca en real mientras el autor aún carga (efecto progresivo).
- **Patrón shimmer**: mismo gradiente animado de `ExploreGridSkeleton` — `%shimmer` con `background-size: 200%` y `animation: shimmer 1.4s infinite`.
- **Fidelidad estructural**: cada skeleton replica las dimensiones y el layout del componente real para evitar saltos de layout al resolver la carga.

## Componentes nuevos

### BookInfoCardSkeleton

Archivo: `src/components/book/info/BookInfoCardSkeleton.tsx` + `.scss`

Replica el layout de `BookInfoCard`:

- Wrapper: mismo card con borde, sombra y radio que el real (`book-info-card`)
- **Portada** (izquierda): shimmer de 300px alto en móvil; 250px de ancho en desktop (`@include from($bp-md)`)
- **Detalle** (derecha):
  - Línea corta ~80px — genre
  - Línea larga ~70% — título
  - Línea media ~40% — autor
  - Rectángulo compacto — info-row (rating + páginas + año + ISBN)
  - Rectángulo ~170px alto — sinopsis
  - Botón shimmer alineado a la derecha — footer

### AuthorSectionSkeleton

Archivo: `src/components/book/info/AuthorSectionSkeleton.tsx` + `.scss`

Replica el layout de `AuthorSection`:

- Línea shimmer ~160px — título de sección
- Card (mismos estilos que `author-section__card`):
  - Círculo shimmer 130×130px posicionado absolutamente (igual que la foto real)
  - Línea de nombre ~200px
  - Rectángulo ~90px alto — bio
- Fila de 3 libros: portada shimmer (aspect-ratio 2/3, flex 0 0 145px) + 2 líneas debajo (título + año)

## Integración en BookDetailPage

```tsx
// Antes (loading state)
if (loading) {
  return (
    <div className="book-detail-page">
      <p className="book-detail-page__status">{t("bookDetail.loading")}</p>
    </div>
  );
}

// Después
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

```tsx
// Antes (authorLoading inline)
{authorLoading
  ? <p className="book-detail-page__status">{t("bookDetail.loading")}</p>
  : <AuthorSection authorInfo={authorInfo ?? book.authorInfo} />
}

// Después
{authorLoading
  ? <AuthorSectionSkeleton />
  : <AuthorSection authorInfo={authorInfo ?? book.authorInfo} />
}
```

## Archivos afectados

| Acción | Archivo |
|--------|---------|
| Crear  | `src/components/book/info/BookInfoCardSkeleton.tsx` |
| Crear  | `src/components/book/info/BookInfoCardSkeleton.scss` |
| Crear  | `src/components/book/info/AuthorSectionSkeleton.tsx` |
| Crear  | `src/components/book/info/AuthorSectionSkeleton.scss` |
| Modificar | `src/pages/book-detail/BookDetailPage.tsx` |

## Fuera de alcance

- ReviewsSection y RecommendationsSection: no tienen loading state propio actualmente.
- Skeleton para estados de error: se mantiene el mensaje de "página en obras" existente.
