# Rediseño página Explorar — Spec

**Fecha:** 2026-05-21
**Rama:** feature/explore-page-design
**Fuera de alcance:** listas públicas de usuarios (documentado en `docs/superpowers/ideas/listas-publicas-idea.md`)

---

## Resumen

Rediseño completo de `ExplorePage` con 11 secciones para usuarios con login y 5 para usuarios sin login / sin libros en estantería. Se añaden nuevos tipos de sección, un componente de género en mosaico, y se amplía el uso de `FeaturedBookCard` a las secciones de recomendación y novedades.

---

## Decisiones de arquitectura

**Opción elegida: B — `GenreSection` como componente propio.**

El grid de géneros no muestra libros sino tiles de categoría, por lo que no encaja en `ExploreSection`. Se crea como componente independiente. El resto de secciones nuevas se incorporan como nuevos tipos en la infraestructura existente.

---

## Archivos afectados

| Acción | Archivo | Motivo |
|--------|---------|--------|
| Crear | `src/components/explore/GenreSection.tsx` | Mosaico A3 de géneros |
| Crear | `src/components/explore/GenreSection.scss` | Estilos del mosaico |
| Modificar | `src/types/ExploreTypes.ts` | Añadir nuevos tipos; eliminar `"fiction"`, `"non-fiction"`, `"quick-reads"` |
| Modificar | `src/hooks/useExploreSections.ts` | `buildSections()` con el nuevo orden y algoritmos |
| Modificar | `src/services/firebase/firebaseBooks.ts` | Nuevas funciones de consulta |
| Modificar | `src/pages/explore/ExplorePage.tsx` | Lógica de `shelfDerived`, renderizado de `GenreSection`, prop `featured` |
| Modificar | `src/components/explore/ExploreSection.tsx` | Soporte para prop `featured` (ya parcialmente diseñado) |

**Tipos eliminados de `ExploreSectionType`:** `"fiction"`, `"non-fiction"`, `"quick-reads"`, `"new-releases"`. El tipo `"top-rated"` se renombra a `"acclaimed"` en `ExploreSectionType`.

---

## Secciones — vista con login

Orden fijo en `buildSections`. Cada sección se omite si no hay datos suficientes.

| # | Tipo | Layout | Estado |
|---|------|--------|--------|
| 1 | `trending` | 4 cards + número ranking | Implementado |
| 2 | `because-liked` | FeaturedBookCard + 3 BookCard | Nuevo |
| 3 | `because-favorites` | 6 BookCard estándar | Nuevo |
| 4 | `genre-grid` | Mosaico A3 (GenreSection) | Nuevo |
| 5 | `acclaimed` | FeaturedBookCard + 3 BookCard | Actualizar `top-rated` |
| 6 | `more-genre` | 6 BookCard estándar | Implementado |
| 7 | `because-finished` | FeaturedBookCard + 3 BookCard | Nuevo |
| 8 | `more-author` | 6 BookCard estándar | Implementado |
| 9 | `because-reading` | 6 BookCard estándar | Implementado |
| 10 | `waiting` | 6 BookCard estándar | Implementado |
| 11 | `new-releases-for-you` | FeaturedBookCard + 3 BookCard | Actualizar (añadir featured) |

## Secciones — vista sin login / sin libros

| # | Tipo | Layout |
|---|------|--------|
| 1 | `trending` | 4 cards + ranking |
| 2 | `acclaimed` | FeaturedBookCard + 3 BookCard |
| 3 | — | `ExploreConversionBanner` (existente) |
| 4 | `genre-grid` | Mosaico A3 |
| 5 | `more-author` | 6 BookCard estándar (autor popular, sin personalizar) |

> La vista sin login se revisará en una iteración futura para añadir más secciones.

---

## Algoritmos de recomendación

### `because-liked`
- Fuente: libros en `finished` o `reading` con `rating >= 4`
- Referencia: el primero con género disponible
- Query: `getRecommendationsByGenre(genre, lang, excludeKey)`, filtro `rating >= 4.0`, excluye estantería
- Fetch: 4 libros (1 featured + 3 cards)
- Condición de aparición: al menos 1 libro con ≥4★ y género

### `because-favorites`
- Fuente: `getFavorites(uid)` (colección de favoritos del perfil)
- Referencia: el primer favorito con género
- Query: `getRecommendationsByGenre(genre, lang, excludeKey)`, filtro `rating >= 4.0`, excluye estantería
- Fetch: 6 libros
- Condición de aparición: al menos 1 favorito marcado en perfil con género

### `acclaimed`
- Query: nueva función `getAcclaimedBooks(lang, count)` — filtra `rating >= 4.5` en Firestore
- Fetch: 4 libros (1 featured + 3 cards)
- Sin fallback — si no hay suficientes libros con ≥4.5 en DB, la sección no aparece
- Sin login: misma query

### `because-finished`
- Fuente: libros con status `"finished"` y género disponible
- Referencia: el primero con género (diferente al usado en `because-liked`)
- Query: `getRecommendationsByGenre(genre, lang, excludeKey)`, filtro `rating >= 4.0`, excluye estantería
- Fetch: 4 libros (1 featured + 3 cards)
- Condición de aparición: al menos 1 libro en `finished` con género

### `more-genre`
- Género favorito: calculado sobre `wantToRead` + `reading` + `finished` (antes solo `reading` + `finished`)
- Query: `getBooksByGenre(genre, lang)`, excluye estantería
- Fetch: 6 libros

### `new-releases-for-you`
- Sin cambio en la query; se añade prop `featured={true}` al renderizar
- Fetch: 4 libros (1 featured + 3 cards)

### `more-author` (trigger actualizado)
```
1. Buscar en finished + reading libros con rating === 5
2. Tomar el autor con más apariciones entre esos libros
3. Si ningún autor tiene libro con 5★ → fallback: autor con 2+ libros en estantería (lógica actual)
4. En ambos casos: getTopAuthorBooks(authorKey, lang, minCount=4)
   → si devuelve < 4 títulos, la sección no aparece
```
- Sin login: nueva función `getPopularAuthorWithBooks(lang)` — busca el libro con mayor `addCount`, toma su `authorKeys[0]`, verifica ≥4 títulos. Si no cumple, la sección no aparece.

---

## Nuevas funciones en `firebaseBooks.ts`

| Función | Descripción |
|---------|-------------|
| `getAcclaimedBooks(lang, count)` | Libros con `rating >= 4.5`, ordenados por rating desc |
| `getTopAuthorBooks(authorKey, lang, minCount)` | Libros del autor; retorna `[]` si hay menos de `minCount` |
| `getPopularAuthorWithBooks(lang)` | Libro con mayor `addCount` → autor → verifica ≥4 títulos |

---

## Nuevos campos en `shelfDerived` (`ExplorePage`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `fiveStarAuthorKey` | `string \| null` | Autor de libro con rating === 5 (trigger primario de `more-author`) |
| `fiveStarAuthorName` | `string \| null` | Nombre del autor anterior |
| `likedBook` | `Book \| null` | Primer libro con rating >= 4 (referencia para `because-liked`) |
| `finishedBook` | `Book \| null` | Primer libro en `finished` con género (referencia para `because-finished`) |

La selección de `favoriteAuthorKey` pasa a ser fallback: `buildSections` usa `fiveStarAuthorKey` primero y, si es null, recurre a `favoriteAuthorKey`.

El cálculo de `favoriteGenre` se amplía para incluir `wantToRead` además de `reading` + `finished`.

---

## Componente `GenreSection`

### Props
```ts
type GenreSectionProps = {
  featuredGenre: string;       // clave del género héroe (el más frecuente en estantería, o "fiction" para guest)
  genres: string[];            // resto de géneros a mostrar (máx 6)
  onGenreClick: (genre: string) => void;
};
```

### Layout
- Grid CSS: `grid-template-columns: repeat(4, 1fr)`, `grid-template-rows: repeat(2, 130px)`, `gap: var(--space-3)`
- Tile héroe: `grid-column: span 2`, `grid-row: span 2`
- Tile "Todos los géneros": siempre último, fondo `--color-genre-default`, texto `--color-text-primary`
- Mobile (`< 768px`): `grid-template-columns: repeat(2, 1fr)`, `grid-template-rows: repeat(4, 120px)`

### Tokens CSS (sin hardcodear valores)
- Fondos: `--color-genre-fiction`, `--color-genre-nonfiction`, `--color-genre-mystery`, `--color-genre-romance`, `--color-genre-scifi`, `--color-genre-historical`, `--color-genre-default`
- Texto sobre color: `--color-text-on-dark`; sobre `--color-genre-default`: `--color-text-primary`
- Tipografía héroe: `--font-editorial` italic, `--text-3xl`, `--weight-bold`
- Tipografía tiles pequeños: `--font-main`, `--text-sm`, `--weight-semibold`
- Radio: `--radius-lg`
- Sombras: `--shadow-card` / `--shadow-card-hover`
- Transición: `--transition-base`

### Lista de géneros
Ficción, No ficción, Misterio, Romance, Ciencia ficción, Histórica + "Todos los géneros".
El tile héroe es el género más frecuente del usuario (logged-in) o Ficción (guest).

### Navegación
Click en tile → `/explore/section/genre?genre=ficcion` (reutiliza `ExploreSectionPage` existente).

---

## Layout de secciones `featured`

Las secciones marcadas como featured usan `ExploreSection` con `featured={true}`:

```
[FeaturedBookCard — grid-column: span 3] [BookCard] [BookCard] [BookCard]
```

- Grid: `grid-template-columns: repeat(6, minmax(0, 1fr))`, `gap: var(--space-4)`, `align-items: stretch`
- Fetch: 4 libros por sección (en vez de 6)
- Tablet (`768–1023px`): FeaturedBookCard ocupa span 4, BookCards en fila siguiente
- Mobile (`< 768px`): FeaturedBookCard full width layout vertical, BookCards debajo

---

## Claves i18n nuevas

Añadir en `es/` y `en/`:

```json
"explore.sections.becauseLiked": "Porque te gustó {{title}}",
"explore.sections.becauseFavorites": "Basado en tus favoritos",
"explore.sections.becauseFinished": "Porque leíste {{title}}",
"explore.sections.acclaimed": "Aclamados por la crítica",
"explore.sections.genreGrid": "Explorar por género"
```

---

## Lo que no cambia

- `TrendingSection` — sin modificaciones
- `BookCard` — sin modificaciones
- `FeaturedBookCard` — sin modificaciones (ya diseñado en spec `2026-05-20-featured-book-card-design.md`)
- `ExploreConversionBanner` — sin modificaciones
- `ExploreGridSkeleton` — sin modificaciones
- `ExploreSectionPage` (subpágina "Ver más") — sin modificaciones
- `because-reading` y `waiting` — lógica sin cambios, solo se insertan en el nuevo orden
