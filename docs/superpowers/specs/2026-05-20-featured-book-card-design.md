# FeaturedBookCard — Diseño

**Fecha:** 2026-05-20  
**Rama:** feature/explore-page-design

---

## Resumen

Nuevo componente `FeaturedBookCard` — variante horizontal ampliada de `BookCard`. Ocupa 3 columnas del grid de 6 en la página de Explorar. Se usa como primer elemento destacado en secciones de tipo "because-reading".

---

## Estructura visual

```
┌─────────────────────────────────────────────────────────┐
│  [PORTADA]  │ [Género · Fantasía] [Páginas · 662] [Año] │
│             │                                           │
│   200px     │ He robado princesas a reyes agónicos...   │
│   aspect    │ (sinopsis — flex:1, overflow hidden,      │
│   ratio     │  fade degradado al final)                 │
│   2/3       │                                           │
│   padding   │ El nombre del viento                      │
│   8px todos │ Patrick Rothfuss                          │
│   lados     │ ★ 4.8 (2.4k)                              │
│             │ [Ver página]  [Guardar]                   │
└─────────────────────────────────────────────────────────┘
```

### Portada
- Wrapper: `width: 216px`, `padding: 8px` en los 4 lados, `align-items: stretch`
- Imagen: `border-radius: var(--radius-md)`, `object-fit: cover`, se estira al alto total de la card
- Fondo del wrapper: `var(--color-bg-page)` (blanco, igual que la card)

### Panel derecho (body)
- `padding: 8px 14px 8px 4px` — mismo padding vertical que el wrapper de portada, los fondos inferiores se alinean exactamente

Orden de elementos dentro del body (top → bottom):
1. **Meta bar** — `flex-shrink: 0`
2. **Sinopsis** — `flex: 1`, `overflow: hidden`, `mask-image` degradado inferior
3. **Bloque título/autor/rating** — `flex-shrink: 0`
4. **Botones** — `flex-shrink: 0`

### Meta bar
- Tres ítems: Género · Año · Páginas
- Layout: label + punto medio + valor en la misma línea, todo a `10px`
- Borde: `1px solid var(--color-border-outline)`, `border-radius: var(--radius-md)`
- Divisores internos: `border-right: 1px solid var(--color-border-outline)`

### Sinopsis
- `font-family: var(--font-editorial)`, `font-style: italic`, `font-size: var(--text-xs)`, `line-height: 1.65`
- `border-left: 2px solid var(--color-border-strong)`, `padding-left: var(--space-2)`
- `mask-image: linear-gradient(to bottom, black 70%, transparent 100%)`

### Título / autor / rating
- Igual que `BookCard.__title`, `.__author`, `.__rating`

### Botones
- Dos botones `flex: 1`, gap `var(--space-2)`
- Izquierdo: outline (`border: 1px solid var(--color-text-primary)`, fondo transparente) → navega a `/books/:id`
- Derecho: sólido (`background: var(--color-text-primary)`, color blanco) → abre dropdown de estado del shelf (reutiliza lógica de `BookCard`)

---

## Grid de integración

```
[FeaturedBookCard — span 3] [BookCard] [BookCard] [BookCard]
```

- Grid: `grid-template-columns: repeat(6, minmax(0, 1fr))`, `gap: var(--space-4)`, `align-items: stretch`
- La featured card usa `grid-column: span 3`
- Las 3 `BookCard` restantes ocupan 1 columna cada una

---

## Props del componente

```tsx
type FeaturedBookCardProps = {
  book: Book;
};
```

`Book` ya contiene: `key`, `title`, `authors`, `cover_url`, `cover_id`, `rating`, `ratingCount`, `genre`, `first_publish_year`, `pages`

---

## Archivos afectados

| Archivo | Acción |
|---|---|
| `src/components/book/cards/FeaturedBookCard.tsx` | Crear |
| `src/components/book/cards/FeaturedBookCard.scss` | Crear |
| `src/components/explore/ExploreSection.tsx` | Modificar — renderizar `FeaturedBookCard` para el primer libro cuando `featured={true}` |
| `src/components/explore/ExploreSection.scss` | Modificar — grid con `featured` variant |
| `src/pages/explore/ExplorePage.tsx` | Pasar `featured` a la sección `because-reading` |

---

## Comportamiento del dropdown "Guardar"

Igual que `BookCard`: al pulsar "Guardar" se muestra el dropdown de opciones de shelf (`wantToRead`, `reading`, `finished`, `didNotFinish`). Si el usuario no está autenticado, muestra el tooltip existente. El botón refleja el estado guardado con el mismo patrón visual de `BookCard`.

---

## Responsivo

| Breakpoint | Comportamiento |
|---|---|
| Desktop (`≥ 1024px`) | Featured span 3 + 3 BookCards |
| Tablet (`768px–1023px`) | Featured span 4 (ocupa todo el grid de 4 cols) + BookCards en fila siguiente |
| Mobile (`< 768px`) | Featured span 2 (todo el ancho), layout vertical: portada arriba, body abajo |

---

## Lo que NO cambia

- `BookCard` no se modifica
- `ExploreSection` sigue usando `BookCard` para todas las secciones salvo cuando se le pase `featured={true}`
- Tokens CSS: ninguno nuevo, solo los existentes
