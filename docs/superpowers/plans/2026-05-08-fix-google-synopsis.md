# Estabilización de fetchGoogleSynopsis + CORS OpenLibrary — Plan

**Fecha:** 2026-05-08
**Feature:** Reducir la frecuencia de 503s de Google Books añadiendo retry con backoff y timeout, arreglar el bug del fetch otherLang con título vacío, y resolver los CORS esporádicos de OpenLibrary mediante proxy de Vite. La decisión sobre añadir una segunda fuente de sinopsis (Hardcover / OpenLibrary EN) se pospone hasta medir el impacto de estos fixes.

---

## Contexto y análisis de causas

El usuario reporta **503s frecuentes en Google Books**. Investigamos siete causas potenciales en el código actual ([googleBooksApi.ts](../../../src/services/api/googleBooksApi.ts), [useBookDetail.ts](../../../src/hooks/useBookDetail.ts), [apiConnections.ts](../../../src/services/api/apiConnections.ts)):

| Causa | Estado |
|---|---|
| API key sin restricción HTTP referrer en Google Cloud Console | **Acción del usuario** — fuera del código |
| Burst rate de `fetchGoogleCovers` (15 req/s) | **Descartada** — la función ya no se llama desde ningún hook |
| `fetchGoogleSynopsis` sin retry — un 503 transitorio mata la sinopsis | **A arreglar** |
| Bug del título vacío en flujo `otherLang` (BUG 1 de `2026-05-02-language-cache-bugs.md`) | **A arreglar** |
| Sin timeout en axios — requests colgadas bloquean la concurrencia | **A arreglar** |
| Sin deduplicación in-memory entre navegaciones rápidas | **Documentado, no se ataca aquí** |
| Solapamiento Explore covers ↔ BookDetail synopsis | **Mitigado por el descarte de covers** |

**Decisión sobre LibraryThing:** descartado tras test empírico del usuario. El endpoint `librarything.ck.getwork` devuelve `<versionList/>` vacío para libros populares (no hay descripciones cargadas en Common Knowledge) y Cloudflare bloquea cualquier petición que no sea de un navegador con cookies, rompiendo cualquier estrategia de proxy server-side.

**Decisión sobre segunda fuente de sinopsis:** se pospone. Si tras los fixes de este plan los 503 caen lo suficiente, puede que no haga falta. Si siguen siendo frecuentes por motivos de cobertura (Google no tiene la descripción de un libro determinado, no por rate limit), entonces se evaluará Hardcover GraphQL u OpenLibrary `description` (solo aporta EN). Esa decisión queda registrada como **fase futura**, no en este plan.

---

## Frente A — Causas raíz de los 503

### A.1 Restringir la API key (acción manual del usuario)

**No hay cambio en código.** Pasos:

- [ ] Ir a [console.cloud.google.com](https://console.cloud.google.com) → APIs y Servicios → Credenciales → API key de Google Books.
- [ ] *Application restrictions* → seleccionar **HTTP referrers**.
- [ ] Añadir referrers permitidos:
  - `http://localhost:*` (dev)
  - `https://localhost/*` (Capacitor iOS)
  - `capacitor://localhost/*` (Capacitor Android/iOS)
  - El dominio de producción (cuando se despliegue)
- [ ] *API restrictions* → seleccionar **Books API** únicamente.

Esto **no garantiza seguridad absoluta** (las API keys de cliente son inherentemente públicas), pero filtra el abuso casual desde scrapers que extraen la key del bundle. Para una solución de seguridad real haría falta un Cloud Function — fuera del alcance de este plan.

---

### A.2 Retry con backoff exponencial en `fetchGoogleSynopsis`

Reutilizar el patrón ya probado en `fetchGoogleCoverWithRetry` ([googleBooksApi.ts:66-89](../../../src/services/api/googleBooksApi.ts#L66-L89)): 3 intentos máximo, delay `500ms → 1000ms → 2000ms`, retry solo si el error es 503 o 429.

**Refactor recomendado:** extraer la lógica genérica a un helper en lugar de duplicar el bucle:

```ts
// src/services/api/googleBooksApi.ts (privada al módulo)
async function withGoogleRetry<T>(
  operation: () => Promise<T>,
  fallback: T,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (axios.isCancel(err)) throw err;
      const isRetryable = axios.isAxiosError(err) &&
        (err.response?.status === 503 || err.response?.status === 429);
      if (isRetryable && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
        continue;
      }
      return fallback;
    }
  }
  return fallback;
}
```

Y aplicarlo:

```ts
export async function fetchGoogleSynopsis(
  title: string,
  signal: AbortSignal,
  isbn?: string,
  author?: string,
  lang = 'es',
): Promise<string> {
  // Intento 1: ISBN
  if (isbn) {
    const synopsis = await withGoogleRetry(async () => {
      const { data } = await googleBooksClient.get<GoogleBooksResponse>("/volumes", {
        params: { q: `isbn:${isbn}`, langRestrict: lang, maxResults: 1, fields: '...', key: API_KEY },
        signal,
      });
      return extractDescription(data);
    }, '');
    if (synopsis.trim().length > 30) return synopsis;
  }

  // Intento 2: título+autor
  return await withGoogleRetry(async () => {
    const { data } = await googleBooksClient.get<GoogleBooksResponse>("/volumes", { ... });
    const match = data.items?.find(item => /* heurística existente */);
    return match ? (match.volumeInfo.description ?? match.searchInfo?.textSnippet ?? '') : '';
  }, '');
}
```

Notas:
- Si `axios.isCancel(err)` se rethrowea — no queremos retry tras un abort de unmount.
- El `fallback: ''` mantiene el contrato actual (la función nunca rechaza, devuelve cadena vacía cuando todo falla).
- El **código muerto del intento 3** (líneas 218-230, inalcanzable por el `return synopsis2`) se elimina en este mismo refactor.

---

### A.3 Timeout en axios

[apiConnections.ts:8-11](../../../src/services/api/apiConnections.ts#L8-L11) — `googleBooksClient` no tiene `timeout`. Una request colgada bloquea la concurrencia 30+ segundos hasta que axios la abandona por defecto.

```ts
export const googleBooksClient = axios.create({
  baseURL: "https://www.googleapis.com/books/v1",
  timeout: 8000, // 8s — generoso para móvil con conexión lenta, agresivo frente a hangs
});
```

Aplicar el mismo timeout a `openLibraryClient` por consistencia.

Cuando el timeout se dispara, axios lanza `ECONNABORTED` que **no es un 503 ni 429** — por tanto el `withGoogleRetry` no reintentará. Para que sí reintente en ese caso, añadir la condición:

```ts
const isRetryable = axios.isCancel(err) === false && (
  err.code === 'ECONNABORTED' ||
  (axios.isAxiosError(err) && (err.response?.status === 503 || err.response?.status === 429))
);
```

---

### A.4 Bug del título vacío en flujo `otherLang`

[useBookDetail.ts:142-160](../../../src/hooks/useBookDetail.ts#L142-L160) — el fetch background del otro idioma usa `bookFromState?.titles?.[otherLang] ?? ''`. Cuando esa propiedad falta (caso muy frecuente), se llama a Google con `q=intitle:` (título vacío) → resultado garantizado vacío → **request desperdiciada que cuenta para la cuota en cada visita a BookDetailPage**.

Replicar el patrón del flujo principal (líneas 99-106): resolver primero con `fetchWorkEditionByLang(workKey, otherLang)` y solo entonces llamar a Google.

```ts
const otherLang = lang === 'es' ? 'en' : 'es';
getSynopsisFromDB(workKey, otherLang).then(async otherCached => {
  if (otherCached && otherCached.trim().length > 0) return;

  let otherTitle = bookFromState?.titles?.[otherLang];
  let otherIsbn = bookFromState?.isbns?.[otherLang];
  if (!otherTitle || !otherIsbn) {
    const edition = await fetchWorkEditionByLang(workKey, otherLang);
    if (edition?.title) {
      otherTitle = edition.title;
      otherIsbn = edition.isbn;
      updateBookTitleToDB(workKey, edition.title, otherLang, edition.isbn).catch(() => {});
    }
  }

  if (!otherTitle) return; // sin título resuelto, no se llama a Google

  const otherSynopsis = await fetchGoogleSynopsis(
    otherTitle,
    controller.signal,
    otherIsbn,
    bookFromState?.authors?.[0],
    otherLang
  );

  if (otherSynopsis.trim().length > 0) {
    saveSynopsisToDB(workKey, otherSynopsis, otherLang);
  }
}).catch(() => {});
```

---

### A.5 Bug ortogonal — título no resuelto a `lang`

[useBookDetail.ts:127, 134](../../../src/hooks/useBookDetail.ts#L127) — el `setBook` usa `bookFromState?.title` y `bookFromState?.isbn` planos, sin resolución por `lang`. Si el usuario cambia de idioma en BookDetailPage, todo se re-fetchea **excepto el título visible**, que sigue mostrando el idioma de origen de la navegación.

```ts
title: bookFromState?.titles?.[lang] ?? bookFromState?.title ?? '',
isbn: bookFromState?.isbns?.[lang] ?? bookFromState?.isbn ?? '',
```

---

### A.6 Limpieza opcional — código muerto de portadas

`fetchGoogleCovers` y `fetchGoogleCoverWithRetry` ya no se llaman desde ningún hook (el import en `useExploreBooks.ts:5` está comentado). **Recomendación:** eliminarlos en el mismo PR — junto al intento 3 muerto de synopsis — para reducir superficie del archivo.

Si se conservan "por si acaso", no pasa nada: no se invocan, no causan problema. Pero el helper genérico `withGoogleRetry` podría reemplazar la lógica duplicada de `fetchGoogleCoverWithRetry` si se quiere mantener.

---

## Frente B — CORS de OpenLibrary

OpenLibrary soporta CORS en el caso normal (`Access-Control-Allow-Origin: *`), pero hay casos donde falla:

- Cuando OL responde 429/503 por rate limit, **omite las cabeceras CORS** y el navegador reporta error CORS confundiendo la causa.
- `/works/{id}/editions.json` ha tenido reports históricos de CORS intermitente.
- Errores de red/TLS interrumpidos se reportan como "CORS error" en consola.

### B.1 Proxy de Vite en desarrollo

**`vite.config.ts`** — añadir bloque `server.proxy`:

```ts
server: {
  proxy: {
    '/api/ol': {
      target: 'https://openlibrary.org',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/ol/, ''),
    },
  },
},
```

**`src/services/api/apiConnections.ts`** — usar baseURL relativa:

```ts
export const openLibraryClient = axios.create({
  baseURL: import.meta.env.DEV ? '/api/ol' : 'https://openlibrary.org',
  timeout: 8000,
});
```

Esto elimina los CORS errors en `npm run dev`. En `npm run build` (producción) seguirá pegando directamente a `openlibrary.org` — los CORS esporádicos siguen pudiendo ocurrir, pero con menor frecuencia que en dev (donde Vite mete una capa extra que a veces tropieza).

### B.2 Producción — pendiente

Para eliminar CORS en producción habría que:
- **Opción 1:** Firebase Hosting rewrites en `firebase.json`:
  ```json
  "rewrites": [
    { "source": "/api/ol/**", "function": "olProxy" }
  ]
  ```
  + Cloud Function `olProxy` que reenvía a `openlibrary.org`.
- **Opción 2:** Cloudflare Worker como proxy si el dominio está detrás de Cloudflare.
- **Opción 3:** Aceptar el comportamiento actual y depender solo del retry para suavizar.

**No se ataca en este plan** — es coste de infraestructura significativo y los CORS esporádicos no rompen la app, solo hacen ruido en consola. Se documenta como tarea futura.

### B.3 Retry para OpenLibrary

Idéntico patrón que `withGoogleRetry`, aplicable a `fetchWorkEditionByLang`, `getWork` y `fetchAuthorBooks`:

```ts
async function withOLRetry<T>(operation: () => Promise<T>, fallback: T, maxRetries = 2): Promise<T> {
  // mismo patrón, status 429/503/ECONNABORTED → retry con backoff 300/600/1200
}
```

Aplicar al menos a `fetchWorkEditionByLang`, que es la que más se llama (en `useBookDetail`, `useAuthorData` → `completeAuthorBookTitles`, `useBookRecommendations` → `completeOtherLangTitles`, `useExploreBooks` → `completeTitles`).

---

## Frente C — Segunda fuente de sinopsis (DEFERRED)

**No se aborda en este plan.** Se decidirá en función de las métricas tras Frente A:

- Si los 503s caen >80%, no hace falta segunda fuente — los 503s eran por rate limit, no por cobertura.
- Si siguen siendo frecuentes pero solo para libros específicos donde Google no tiene `description`, entonces:
  - **Hardcover GraphQL** — modern, gratis con key, soporte de idioma. Mejor opción para bilingüe.
  - **OpenLibrary `description`** — gratis, ya integrada (`getWork` + `extractSynopsis`), pero monolingüe (EN principalmente).
  - LibraryThing **descartado definitivamente** (datos vacíos + Cloudflare).

---

## Acceptance criteria

### Frente A
- [ ] API key restringida en Google Cloud Console (verificación manual).
- [ ] `withGoogleRetry` extraído y aplicado a `fetchGoogleSynopsis`.
- [ ] `googleBooksClient` y `openLibraryClient` con `timeout: 8000`.
- [ ] `useBookDetail` flujo `otherLang` resuelve título/isbn antes de pegar a Google (BUG 1 cerrado).
- [ ] `useBookDetail` resuelve `title` e `isbn` con fallback `titles[lang] → title` y `isbns[lang] → isbn`.
- [ ] Código muerto: intento 3 de `fetchGoogleSynopsis` eliminado. `fetchGoogleCovers`/`fetchGoogleCoverWithRetry` decididos (eliminar o mantener).

### Frente B
- [ ] Vite proxy `/api/ol` configurado.
- [ ] `openLibraryClient.baseURL` condicional dev/prod.
- [ ] `withOLRetry` aplicado a `fetchWorkEditionByLang` como mínimo.
- [ ] `npm run dev` no muestra errores CORS de OpenLibrary en consola tras 5 minutos navegando.

### General
- [ ] `npm run build` y `npm run lint` pasan.
- [ ] Tras 1 día de uso real, los logs `[Synopsis]` muestran `OK` con frecuencia notablemente mayor que antes (medición cualitativa — no hay test automatizado).
- [ ] Los 503 visibles en consola caen significativamente.

---

## Tareas pendientes ortogonales (NO entran en este plan)

- (a) Doble ciclo de efecto en `useAuthorData` y `useBookRecommendations` cuando `book` aún es `null`.
- (d) `useBookRecommendations` reescribe `saveBooksToDB` cada fallback sin TTL.
- (f) `loading` en `useBookDetail` no se resetea al cambiar `lang`.
- (g) `saveBooksToDB` en `useAuthorData` se dispara fire-and-forget en cada fallback.
- Sin deduplicación de `fetchWorkEditionByLang` cuando varios hooks piden el mismo workKey simultáneamente.
- Cloud Function de proxy para OpenLibrary en producción (Frente B.2).
- Decisión sobre Hardcover/OL como segunda fuente (Frente C, condicional a métricas).
