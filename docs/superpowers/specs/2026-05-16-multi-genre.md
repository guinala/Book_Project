# Multi-género en libros

**Date:** 2026-05-16
**Branch:** Develop
**Related specs:** [2026-05-16-explore-search-hybrid.md](./2026-05-16-explore-search-hybrid.md)

---

## Overview

Hoy un libro tiene **un solo género** (`Book.genre`, string). Una novela puede pertenecer a dos (p. ej. Fantasía y Romance por sus tópicos). Se quiere:

1. Que la detección de género produzca **hasta 2 géneros** a partir de los tópicos de OpenLibrary.
2. Que la página de info muestre **los dos** (`Fantasía | Romance`).
3. Que se guarden en BBDD **todos los tópicos** (`subjects`) crudos de la API.

### Decisión clave de modelo de datos

**No** se convierte `genre` en un array. Motivo: las queries de Explorar (`getBooksByGenre`, `getRecommendationsFromDB`, `getGenreNewReleases`, `getRecommendationsByGenre`) hacen `where("langs","array-contains",lang) + where("genre","==",genre)`. Si `genre` pasara a array, sería `where("langs","array-contains") + where("genres","array-contains")` → **dos `array-contains` en una query → ilegal en Firestore**.

Por eso:
- `genre` (string) **se mantiene** como género **primario** — escalar, consultable, las queries de Explorar **no se tocan**.
- `genre2?` (string) — género **secundario** opcional, solo para mostrar.
- `topics` (string[]) — todos los subjects crudos.

Consecuencia asumida: el segundo género **no es filtrable** en Explorar (un libro Fantasía|Romance solo aparece en la sección "Fantasía"). El requisito 2 pide solo *mostrar* los dos, no filtrar por el segundo — así que esto lo cubre con cero ripple.

---

## Modelo de datos (`Books/{bookId}`)

```ts
genre: string         // primario — ya existe, sin cambios; lo usan las queries de Explorar
genre2?: string       // NUEVO — secundario opcional
topics: string[]      // NUEVO — todos los subjects crudos de OpenLibrary
```

---

## Plan por batches

| # | Batch | Contenido | Verificación |
|---|-------|-----------|--------------|
| 1 | Detección | `detectGenres` + helper `genreFieldsFromSubjects` en `genreUtils.ts` | Unit-test mental: subjects con 2 géneros → array de 2 |
| 2 | Going-forward | `Book` (`genre2`, `topics`) + mappers de `openLibraryApi.ts` + `saveBooksToDB` | Un libro nuevo cacheado tiene `genre2`/`topics` |
| 3 | Página de info | `BookInfoCard` muestra `genre \| genre2` | Detalle de un libro con 2 géneros |
| 4 | Backfill | `backfill-genres.cjs` — re-pide subjects a OL por cada libro existente | Libros viejos con `genre2`/`topics` tras la corrida |

---

## Batch 1 — Detección de géneros

### 1.1 `src/utils/genreUtils.ts`

**`detectGenres`** — sustituye a `detectGenre`. Recorre los subjects y recolecta **hasta 2 géneros distintos**; si no encuentra ninguno mapeado, cae al fallback Fiction/Non-Fiction (1 elemento).

```ts
export function detectGenres(subjects: string[] | undefined): string[] {
  if (!subjects || subjects.length === 0) return [];

  const found: string[] = [];
  for (const subject of subjects) {
    const lower = subject.toLowerCase();
    for (const [genre, keywords] of Object.entries(GENRE_MAP)) {
      if (keywords.includes(lower) && !found.includes(genre)) {
        found.push(genre);
        if (found.length === 2) return found;
      }
    }
  }

  if (found.length > 0) return found;

  // Fallback: ningún género mapeado
  const fiction = subjects.some((s) => s.toLowerCase() === "fiction");
  return [fiction ? "Fiction" : "Non-Fiction"];
}
```

**`genreFieldsFromSubjects`** — helper para que los mappers de la API no repitan la misma lógica 5 veces. Devuelve los tres campos listos para volcar en un `Book`:

```ts
export function genreFieldsFromSubjects(subjects: string[] | undefined): {
  genre: string | undefined;
  genre2: string | undefined;
  topics: string[];
} {
  const genres = detectGenres(subjects);
  return {
    genre: genres[0],
    genre2: genres[1],
    topics: subjects ?? [],
  };
}
```

**`detectGenre`** (la función vieja, singular) — eliminarla cuando ya no la use ningún caller (un grep lo confirma; los mappers pasan a usar el helper en el Batch 2).

`genreToI18nKey` no cambia.

---

## Batch 2 — Going-forward (escritura de los campos nuevos)

### 2.1 `src/types/Book.ts`

Añadir dos campos:

```ts
export type Book = {
  // ...campos existentes
  genre?: string;
  genre2?: string;      // NUEVO
  topics?: string[];    // NUEVO
  // ...
};
```

### 2.2 `src/services/api/openLibraryApi.ts`

Los mappers consumen hoy `doc.subject` para `genre: detectGenre(doc.subject)` y **descartan el resto**. Pasan a usar el helper, que rellena los tres campos.

**Import:**
```ts
import { genreFieldsFromSubjects } from "@/utils/genreUtils";
```

**Mappers que detectan género** — `searchBooks`, `fetchFantasyBooks`, `fetchBookByTitle`, `fetchAuthorBooks`: en el objeto `Book` que construyen, sustituir la línea `genre: detectGenre(doc.subject),` por el spread del helper:
```ts
return {
  key: doc.key,
  title: ...,
  // ...resto de campos
  ...genreFieldsFromSubjects(doc.subject),   // aporta genre, genre2, topics
};
```

**`fetchBooksByGenre`** es distinto — ahí el `genre` lo da el parámetro de la función (es una búsqueda *por* género), no se detecta. En ese mapper: mantener `genre: genre` (el parámetro) y añadir solo `topics: doc.subject ?? []`. `genre2` se deja `undefined`.

> Tras esto, `detectGenre` (singular) ya no debería tener callers — eliminarla de `genreUtils.ts`.

### 2.3 `src/services/firebase/firebaseBooks.ts`

`saveBooksToDB` — añadir `genre2` y `topics` al `batch.set`:
```ts
batch.set(ref, {
  key: book.key,
  authors: book.authors,
  authorTokens: buildAuthorTokens(book.authors ?? []),
  first_publish_year: book.first_publish_year,
  cover_id: book.cover_id,
  cover_url: book.cover_url ?? null,
  edition_count: book.edition_count,
  genre: book.genre ?? null,
  genre2: book.genre2 ?? null,      // NUEVO
  topics: book.topics ?? [],        // NUEVO
  rating: book.rating ?? null,
  ratingCount: book.ratingCount ?? null,
  isbn: book.isbn ?? null,
  pages: book.pages ?? null,
  authorKeys: book.authorKeys ?? [],
  langs: arrayUnion(lang),
}, { merge: true });
```

`mapBookDoc` (el helper que lee docs de `Books`) — añadir `genre2: data.genre2 ?? undefined` y `topics: data.topics ?? undefined` al objeto que devuelve, para que los `Book` leídos de BBDD también traigan los campos nuevos.

> Las queries de Explorar (`getBooksByGenre`, etc.) **no se tocan** — siguen usando `where("genre","==",...)`, y `genre` sigue siendo escalar.

---

## Batch 3 — Página de info

### 3.1 `src/components/book/info/BookInfoCard.tsx`

Hoy ([líneas 113-115](src/components/book/info/BookInfoCard.tsx#L113)):
```tsx
<span className="book-info-card__genre">
  {book.genre ? t(`book.genres.${genreToI18nKey(book.genre)}`, { defaultValue: book.genre }) : ""}
</span>
```

Pasa a renderizar `genre` y, si existe, `genre2`, traducidos y unidos por ` | `:
```tsx
<span className="book-info-card__genre">
  {[book.genre, book.genre2]
    .filter((g): g is string => !!g)
    .map((g) => t(`book.genres.${genreToI18nKey(g)}`, { defaultValue: g }))
    .join(" | ")}
</span>
```

- `.filter((g): g is string => !!g)` descarta `undefined` (y estrecha el tipo a `string`).
- `.map(...)` traduce cada género con el patrón i18n existente.
- `.join(" | ")` los une. Con 1 género da `"Fantasía"`; con 2, `"Fantasía | Romance"`; con 0, cadena vacía.

No hace falta tocar el SCSS — es el mismo `<span>`.

---

## Batch 4 — Backfill `backfill-genres.cjs`

Los libros ya en `Books` tienen `genre` (uno solo) y **no** tienen `genre2` ni `topics`. El género se deriva de los `subjects` de OpenLibrary, que **no están guardados** en el doc — así que, a diferencia del backfill de tokens, **no se puede re-derivar localmente**. Este script **re-pide cada libro a OpenLibrary** para obtener sus subjects.

### 4.1 Cuidado con OpenLibrary — lo más importante

Re-pedir N libros a OpenLibrary sin control hace que te **throttleen (HTTP 429) o bloqueen**. El proyecto ya aplica esta disciplina en otro sitio (CLAUDE.md: las portadas de Google Books se piden "en lotes de 3 con 200 ms de delay"). El script debe:

- **Limitar la concurrencia** — como mucho `CONCURRENCY` peticiones simultáneas (empezar conservador: **4**).
- **Pausar entre lotes** — `DELAY_MS` entre cada grupo de `CONCURRENCY` (empezar con **500 ms**).
- **Ser idempotente** — saltar los libros que ya tengan `topics`. Es la **red de seguridad**: si te throttlean a mitad o el script casca, vuelves a lanzarlo y **retoma** donde estaba, sin repetir trabajo.
- **Aislar errores por libro** — un 404 (work borrada) o un fallo de red en un libro **no** debe tumbar la corrida: se atrapa, se cuenta como `fallido`, y se sigue.

Si en la corrida ves muchos `fallidos` con código 429: sube `DELAY_MS`, baja `CONCURRENCY`, y relanza — la idempotencia hace que solo reintente lo que faltaba. (Un retry con backoff exponencial sería más fino, pero para un script de una sola vez, "subir el delay y relanzar" es más simple y suficiente.)

Es un proceso **lento** (proporcional al tamaño del catálogo) pero **de una sola vez** — una vez corrido, los libros existentes quedan migrados y los nuevos obtienen `genre2`/`topics` vía `saveBooksToDB`.

### 4.2 El script — `src/scripts/backfill-genres.cjs`

Script aparte del de tokens (aquel es puramente local y rápido; no mezclar llamadas de red). Usa el `fetch` nativo de Node 18+ — **no** importa `openLibraryApi.ts` (ese arrastra `i18n` y otros módulos acoplados al navegador que pueden no cargar bajo Node). Solo importa `detectGenres` de `genreUtils.ts`, que es un archivo puro.

```js
// src/scripts/backfill-genres.cjs
//   npx tsx src/scripts/backfill-genres.cjs --dry-run
//   npx tsx src/scripts/backfill-genres.cjs
const admin = require("firebase-admin");
const serviceAccount = require("../../serviceAccountKey.json");
const { detectGenres } = require("../utils/genreUtils.ts");

const DRY_RUN = process.argv.includes("--dry-run");
const PAGE_SIZE = 200;       // docs leídos de Firestore por página
const CONCURRENCY = 4;       // peticiones simultáneas a OpenLibrary
const DELAY_MS = 500;        // pausa entre lotes de CONCURRENCY

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

let scanned = 0;
let updated = 0;
let skipped = 0;
let failed = 0;

async function processBook(docSnap) {
  scanned++;
  const data = docSnap.data();

  // Idempotente: si ya tiene topics, no se reprocesa
  if (Array.isArray(data.topics)) {
    skipped++;
    return;
  }

  if (!data.key) {
    failed++;
    console.warn(`  sin 'key' en doc ${docSnap.id}`);
    return;
  }

  try {
    const res = await fetch(`https://openlibrary.org${data.key}.json`);
    if (!res.ok) {
      failed++;
      console.warn(`  HTTP ${res.status} en ${data.key}`);
      return;
    }
    const work = await res.json();
    const subjects = Array.isArray(work.subjects) ? work.subjects : [];

    let payload;
    if (subjects.length === 0) {
      // Sin subjects: no se toca el genre existente, solo se marca topics
      // para que el doc quede idempotente y no se reprocese.
      payload = { topics: [] };
    } else {
      const genres = detectGenres(subjects);
      payload = {
        genre: genres[0] ?? null,
        genre2: genres[1] ?? null,
        topics: subjects,
      };
    }

    updated++;
    if (!DRY_RUN) {
      await docSnap.ref.update(payload);
    }
  } catch (e) {
    failed++;
    console.warn(`  error en ${data.key}: ${e.message}`);
  }
}

async function main() {
  const booksRef = db.collection("Books");
  let lastDoc = null;

  for (;;) {
    let q = booksRef
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(PAGE_SIZE);
    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) break;

    // Procesar la página en lotes de CONCURRENCY, con pausa entre lotes
    for (let i = 0; i < snap.docs.length; i += CONCURRENCY) {
      const chunk = snap.docs.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(processBook));
      await sleep(DELAY_MS);
    }

    console.log(
      `${DRY_RUN ? "[DRY-RUN] " : ""}progreso — escaneados: ${scanned}, ` +
        `actualizados: ${updated}, saltados: ${skipped}, fallidos: ${failed}`
    );

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE_SIZE) break;
  }

  console.log(
    `${DRY_RUN ? "[DRY-RUN] " : ""}FIN — escaneados: ${scanned}, ` +
      `actualizados: ${updated}, saltados: ${skipped}, fallidos: ${failed}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

Notas del script:

- **`processBook`** se ejecuta para cada libro. La concurrencia la controla el bucle de `main`: trocea cada página en grupos de `CONCURRENCY`, lanza ese grupo con `Promise.all`, y **espera `DELAY_MS`** antes del siguiente. Así nunca hay más de 4 peticiones a OL a la vez.
- **No usa `writeBatch`** — cada libro hace su propio `docSnap.ref.update(...)`. Como el ritmo lo marca el throttle de OL, las escrituras a Firestore quedan repartidas solas; un batch aquí solo complicaría el código asíncrono.
- **`subjects.length === 0`**: se escribe `topics: []` (no `genre`) — así no se machaca el `genre` que el libro ya tenía, y el doc queda con `topics` array → idempotente, no se reprocesa.
- **`--dry-run`**: cuenta y hace los `fetch` (para que veas `fallidos` reales), pero **no** escribe (`docSnap.ref.update` se salta). Útil para estimar cuánto tardará y ver si OL te throttlea antes de la corrida real.
- Imprime progreso **por página** además del resumen final, para ver que el script sigue vivo durante una corrida larga.

### 4.3 Ejecución

```powershell
npx tsx src/scripts/backfill-genres.cjs --dry-run
npx tsx src/scripts/backfill-genres.cjs
```

(El service account ya está embebido vía `require`, igual que en `backfill-title-tokens.cjs`. Sin variables de entorno.)

### 4.4 Verificación Batch 4

- [ ] `--dry-run` imprime progreso y un resumen sin escribir nada.
- [ ] Corrida real: un libro viejo en la consola de Firestore tiene ahora `genre2` (si aplica) y `topics`.
- [ ] Segunda corrida: casi todo sale como `saltados` (idempotencia).
- [ ] Si hubo `fallidos` con 429 → subir `DELAY_MS`, bajar `CONCURRENCY`, relanzar.

---

## Archivos tocados (resumen)

| Archivo | Batch |
|---------|-------|
| `src/utils/genreUtils.ts` | 1, 2 |
| `src/types/Book.ts` | 2 |
| `src/services/api/openLibraryApi.ts` | 2 |
| `src/services/firebase/firebaseBooks.ts` | 2 |
| `src/components/book/info/BookInfoCard.tsx` | 3 |
| `src/scripts/backfill-genres.cjs` | 4 |

---

## Fuera de alcance

- Hacer el segundo género **filtrable** en Explorar — exigiría reestructurar las queries de género (mover el filtro de `langs` a cliente). El requisito es solo mostrar los dos.
- Más de 2 géneros — el tope es 2 por diseño (`detectGenres` corta en 2).
- Retry con backoff exponencial en el backfill ante 429 — se resuelve con "subir `DELAY_MS` y relanzar" aprovechando la idempotencia.
- Mostrar/usar `topics` en la UI — de momento `topics` solo se guarda (requisito 3); su uso (p. ej. una sección de tópicos en la página de info) queda para más adelante.
