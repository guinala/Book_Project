# Bugs pendientes en la solución multi-idioma

Revisión del 2026-05-02 sobre la implementación documentada en `2026-04-30-language-cache-solution.md`.

---

## BUG 1 — Fetch proactivo de sinopsis usa título del idioma incorrecto
**Gravedad: Media** — anula el propósito del fetch proactivo, no rompe nada visible
**Archivo:** `src/hooks/useBookDetail.ts`, líneas 128-129

El fetch background de sinopsis para el otro idioma usa `bookFromState?.title`, que es el título en el idioma **actual** del usuario, no en el idioma destino.

```ts
// Actual (incorrecto):
fetchGoogleSynopsis(
  bookFromState?.title ?? decodedId,  // ← título en idioma actual
  controller.signal,
  bookFromState?.isbn,
  bookFromState?.authors?.[0],
  otherLang                           // ← pero pide sinopsis en el OTRO idioma
)
```

Google Books con `langRestrict: 'en'` buscando "El Nombre del Viento" probablemente no devuelve resultados. El fetch falla silenciosamente y la sinopsis del otro idioma no se guarda.

**Solución propuesta:**
```ts
const otherTitle = bookFromState?.titles?.[otherLang]
  ?? bookFromState?.title
  ?? decodedId;

fetchGoogleSynopsis(otherTitle, controller.signal, bookFromState?.isbn, bookFromState?.authors?.[0], otherLang)
```

---

## BUG 2 — Promise rejection sin manejar en useAuthorData
**Gravedad: Baja** — warning en consola, no afecta funcionalidad
**Archivo:** `src/hooks/useAuthorData.ts`

`saveAuthorToDB(...)` se llama fire-and-forget sin `.catch()`. Si falla, genera un unhandled promise rejection.

**Solución:** Añadir `.catch(() => {})` a la llamada.

---

## BUG 3 — useProfile no reacciona a cambios de idioma en perfiles públicos
**Gravedad: Baja** — requiere re-montar el componente para ver títulos actualizados
**Archivo:** `src/hooks/useProfile.ts`, línea 93

El `useEffect` que carga la shelf de un perfil público tiene `[userId, user]` como dependencias, sin incluir `lang`. Si el usuario cambia de idioma viendo un perfil público, los títulos no se re-resuelven.

**Solución:** Añadir `lang` a las dependencias del efecto, o re-resolver títulos en un `useMemo` derivado.

---

## Inconsistencias menores (no rompen, pero son frágiles)

### getShelf no recibe `lang`
**Archivo:** `src/services/firebase/firebaseLibrary.ts`, línea 110

Resuelve `titles.es → titles.en → title` hardcodeado. Funciona porque los callers (`ShelfContext`, `useProfile`) re-resuelven con `titles[lang]` después, pero hace la cadena de fallback dependiente de que ambos lados cooperen correctamente.

### ShelfContext fallback incompleto
**Archivo:** `src/context/ShelfContext.tsx`, líneas 140 y 175

`shelfByStatus` y `getEntry` usan `book.titles?.[lang] ?? book.title` sin los intermedios `titles.es → titles.en`. Funciona porque `getShelf` ya pre-resuelve `book.title` con esos fallbacks, pero es inconsistente con `useProfile.entriesToShelf` que sí tiene la cadena completa.

### getShelf ignora el mapa `isbns`
**Archivo:** `src/services/firebase/firebaseLibrary.ts`, línea 120

Solo lee `data.isbn` plano, no usa `data.isbns?.[lang]`. `ShelfContext` compensa parcialmente con `book.isbns?.[lang] ?? book.isbn`, pero sin fallback `es → en`.

### saveBooksToDB aún escribe `isbn` plano
**Archivo:** `src/services/firebase/firebaseBooks.ts`, línea 70

Se eliminó `title` plano de la escritura pero `isbn` se mantuvo. Inofensivo como fallback legacy, pero inconsistente.
