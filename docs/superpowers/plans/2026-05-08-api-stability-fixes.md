# Estabilidad de APIs y reducción de re-fetches — Plan

**Fecha:** 2026-05-08
**Feature:** Cinco tareas ortogonales detectadas durante la revisión del flujo de BookDetailPage + arreglo de los CORS esporádicos de OpenLibrary. Todas son parches independientes; pueden aplicarse en cualquier orden.

---

## Contexto

Tras implementar el plan multi-source (`2026-05-08-synopsis-multi-source.md`), quedan abiertas cinco tareas ortogonales y un problema de CORS intermitente en OpenLibrary. Ninguna rompe la app, pero todas suman ruido en consola, gasto de cuota innecesario o experiencia inconsistente.

Las tareas se agrupan en cuatro frentes por afinidad técnica. Cada frente puede implementarse de forma independiente — no hay dependencias entre ellos.

---

## Frente A — Verificación de auto-estabilización (REVISADO)

**Hipótesis original (descartada):** `useBookRecommendations` y `useAuthorData` causaban write amplification a Firestore al re-llamar la API cada navegación. La propuesta era TTL en localStorage.

**Análisis correcto:** el flujo se auto-estabiliza solo:

- `getRecommendationsFromDB` ([firebaseBooks.ts:192-231](../../../src/services/firebase/firebaseBooks.ts#L192-L231)) devuelve `null` solo si hay **menos de 20** libros para `(genre, lang)`.
- `saveBooksToDB` escribe `genre` y `langs: arrayUnion(lang)`.
- Tras la primera escritura de 30 libros, la siguiente navegación con el mismo `(genre, lang)` encuentra los datos y **no vuelve a llamar a la API**.
- Mismo razonamiento en `useAuthorData` con `getAuthorBooksFromDB` + `dbBooks.length >= 2`.

Por tanto **no hay problema de write amplification**. La escritura ocurre como mucho una vez por `(genre, lang)` o `(authorKey, lang)` durante la vida del proyecto.

### A — Tarea real: verificar integridad de datos guardados

Si en algún momento se observa que `getRecommendationsFromDB` o `getAuthorBooksFromDB` siguen devolviendo `null` repetidamente para el mismo `(genre, lang)` tras la primera escritura, **el bug está en la escritura**, no en la lectura. Posibles causas:

- Libros guardados con `genre: null` (cuando `book.genre` es undefined en `fetchBooksByGenre`).
- Libros guardados sin `langs[lang]` por algún fallo en el `arrayUnion`.
- Race entre múltiples saves concurrentes.

**Acción:** monitorizar via consola Firebase tras un día de uso real. Si las escrituras a `Books/...` siguen disparándose con frecuencia inesperada, abrir investigación específica. Sin evidencia, no se hace nada.

---

## Frente B — Deduplicación de `fetchWorkEditionByLang`

**Problema:** Múltiples hooks (`useBookDetail`, `useAuthorData → completeAuthorBookTitles`, `useBookRecommendations → completeOtherLangTitles`, `useExploreBooks → completeTitles`) pueden pedir la misma `(workKey, lang)` simultáneamente. Cada uno dispara su propia request a `/editions.json`.

**Solución:** in-memory dedup con `Map<key, Promise>` que solo guarda la promesa mientras está en vuelo:

```ts
// src/services/api/openLibraryApi.ts
const editionInFlight = new Map<string, Promise<{ title: string; isbn?: string } | null>>();

export async function fetchWorkEditionByLang(
  workKey: string,
  lang: string
): Promise<{ title: string; isbn?: string } | null> {
  const cacheKey = `${workKey}|${lang}`;
  const existing = editionInFlight.get(cacheKey);
  if (existing) return existing;

  const promise = (async () => {
    const langPath = `/languages/${getLangIso3Letters(lang)}`;
    try {
      const { data } = await openLibraryClient.get<WorkEditionsResponse>(
        `${workKey}/editions.json`,
        { params: { limit: 20 } }
      );
      const edition = data.entries?.find(e => e.languages?.some(l => l.key === langPath));
      if (!edition?.title) return null;
      return { title: edition.title, isbn: edition.isbn_13?.[0] ?? edition.isbn_10?.[0] };
    } catch {
      return null;
    }
  })().finally(() => editionInFlight.delete(cacheKey));

  editionInFlight.set(cacheKey, promise);
  return promise;
}
```

Notas:
- **No es caché de resultado entre navegaciones** — solo dedup de peticiones concurrentes. Si necesitas caché persistente, ya existe en Firestore vía `titles[lang]`/`isbns[lang]` y `updateBookTitleToDB`.
- Patrón aplicable a otras funciones OL si se ven cuellos similares (`getWork`, `searchAuthor`).

---

## Frente C — CORS esporádico de OpenLibrary

**Problema:** OpenLibrary soporta CORS en condiciones normales, pero fallan esporádicamente:
- Cuando devuelve 429/503 por rate limit, omite cabeceras CORS y el navegador reporta error CORS confundiendo la causa.
- `/works/{id}/editions.json` ha tenido reports históricos de CORS intermitente.
- Errores de red interrumpidos se reportan como "CORS error" en consola.

### C.1 Proxy de Vite en desarrollo

**`vite.config.ts`** — añadir al `server.proxy` existente:

```ts
server: {
  proxy: {
    '/api/lt': { /* ya existe */ },
    '/api/ol': {
      target: 'https://openlibrary.org',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/ol/, ''),
    },
  },
},
```

### C.2 baseURL condicional dev/prod

**`src/services/api/apiConnections.ts`**:

```ts
export const openLibraryClient = axios.create({
  baseURL: import.meta.env.DEV ? '/api/ol' : 'https://openlibrary.org',
  headers: { "Content-Type": "application/json" },
  timeout: 8000,
});
```

En `npm run dev` desaparecen los errores CORS porque el navegador habla con su propio origen. En `npm run build` (producción) sigue pegando directo a OL — los CORS esporádicos pueden ocurrir, pero con menor frecuencia.

### C.3 Retry con backoff (opcional, mayor impacto)

Mismo patrón que `fetchGoogleCoverWithRetry`, aplicable a `fetchWorkEditionByLang`, `getWork` y `fetchAuthorBooks`. Cubre el ~80% de los CORS esporádicos sin tocar infraestructura:

```ts
async function withOLRetry<T>(operation: () => Promise<T>, fallback: T, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (axios.isCancel(err)) throw err;
      const isRetryable =
        err.code === 'ECONNABORTED' ||
        (axios.isAxiosError(err) && (err.response?.status === 429 || err.response?.status === 503)) ||
        (axios.isAxiosError(err) && !err.response); // network error sin respuesta
      if (isRetryable && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 300));
        continue;
      }
      return fallback;
    }
  }
  return fallback;
}
```

Aplicar al menos a `fetchWorkEditionByLang`, que es la más llamada.

### C.4 Producción (futuro, fuera de este plan)

Tres opciones, ninguna se ataca aquí:

| Opción | Esfuerzo | Notas |
|---|---|---|
| Firebase Cloud Function + `firebase.json` rewrite `/api/ol/**` → función | Medio | Alineado con stack actual |
| Cloudflare Worker | Bajo | Solo si el dominio está detrás de Cloudflare |
| Aceptar y depender de C.3 | Mínimo | El que aplica este plan |

---

## Frente D — UX y estructura

### D.1 Doble ciclo de efecto en `useAuthorData` y `useBookRecommendations`

**Problema:** En el primer render de BookDetailPage, `book === null` → ambos hooks reciben strings vacíos y hacen early-return. Cuando `book` carga, el efecto se ejecuta de verdad. Resultado: cada hook corre su `useEffect` dos veces por mount.

**No es bug funcional** — el guard early-return evita side effects en el primer ciclo. La cuestión es si la limpieza estructural justifica el refactor.

**Solución (si se aplica):** mover los hooks a sub-componentes que solo se monten cuando `book` exista. En [BookDetailPage.tsx](../../../src/pages/book-detail/BookDetailPage.tsx):

```tsx
{book && (
  <>
    <AuthorBlock authorName={book.author} title={book.title} authorKey={book.authorKey} />
    <RecommendationsBlock genre={book.genre} excludeKey={book.key} title={book.title} />
  </>
)}
```

Donde `AuthorBlock` y `RecommendationsBlock` son nuevos componentes que llaman `useAuthorData` y `useBookRecommendations` internamente. Como solo se montan cuando `book` está, el hook corre una vez.

**Recomendación:** baja prioridad. Solo si el doble ciclo causa ruido medible (logs duplicados, escrituras dobles, etc.).

---

### D.2 `loading` no se resetea al cambiar `lang`

**Problema:** [useBookDetail.ts:35](../../../src/hooks/useBookDetail.ts#L35) — `useState(isAPIKey)` solo se evalúa al montar. Cuando el usuario cambia idioma estando en BookDetailPage, el efecto re-corre y re-fetchea, pero `loading` sigue en `false` y la sinopsis vieja se ve hasta que llega la nueva.

**Decisión UX antes de implementar:**

- **Opción 1 — mantener comportamiento actual:** la sinopsis vieja sigue visible mientras carga la nueva. Es menos disruptivo. No requiere cambio.
- **Opción 2 — spinner al cambiar idioma:** añadir `setLoading(true)` al inicio del `useEffect`:
  ```ts
  useEffect(() => {
    if(!isAPIKey) return;
    setLoading(true);  // ← añadir
    let cancelled = false;
    const controller = new AbortController();
    ...
  ```
  El `finally` ya pone `false` al terminar.

Pendiente decidir. Por defecto se asume Opción 1 (no hacer nada) salvo que la UX actual moleste.

---

## Acceptance criteria

### Por frente (independientes)

**A — Escrituras a Firestore**
- [ ] Verificación pasiva: tras un día de uso real, las escrituras a `Books/...` no se repiten con la misma frecuencia que las navegaciones (sería signo de bug en la escritura, no en el patrón).

**B — Dedup de editions**
- [ ] B aplicado en `fetchWorkEditionByLang`.
- [ ] Tras abrir un libro con autor que tiene 10 libros sin `titles[lang]`, las requests a `/editions.json` para el mismo workKey en network panel son únicas (no duplicadas concurrentes).

**C — CORS OpenLibrary**
- [ ] C.1 + C.2 aplicados.
- [ ] Tras 5 minutos de navegación en `npm run dev`, no aparecen errores CORS de OL en consola.
- [ ] (Opcional) C.3 aplicado a `fetchWorkEditionByLang`.

**D — UX**
- [ ] D.1 aplicado *o* explícitamente descartado por baja prioridad.
- [ ] D.2 decidido (Opción 1 o 2) y aplicado si Opción 2.

### General
- [ ] `npm run build` y `npm run lint` pasan.
- [ ] Ninguna regresión visible en BookDetailPage tras los cambios.

---

## Tareas pendientes que NO entran en este plan

- Cloud Function de proxy para OpenLibrary en producción (Frente C.4).
- Decisión sobre Hardcover/OL como segunda fuente de sinopsis si LT falla en runtime.
- Caché persistente de `fetchWorkEditionByLang` entre navegaciones (Frente B solo dedup en vuelo).
- Estabilización de `fetchGoogleSynopsis` con retry/timeout — vive en su propio plan (`2026-05-08-fix-google-synopsis.md`) para no mezclar.
