# Sinopsis multi-fuente con `Promise.any` (Google Books + LibraryThing) — Plan

**Fecha:** 2026-05-08
**Feature:** Añadir LibraryThing como segunda fuente de sinopsis bilingüe que compita con Google Books mediante `Promise.any`. La primera respuesta válida gana. Mantener la sincronización bilingüe (idioma actual + secundario en background) ya existente.

---

## Contexto

Hoy la sinopsis se obtiene únicamente de Google Books vía `fetchGoogleSynopsis` ([googleBooksApi.ts:168](../../../src/services/api/googleBooksApi.ts#L168)) con un waterfall de 3 intentos (ISBN → título+autor con `langRestrict` → título+autor sin restricción). El intento 3 está actualmente *muerto* — hay un `return synopsis2` antes que lo hace inalcanzable ([googleBooksApi.ts:216](../../../src/services/api/googleBooksApi.ts#L216)).

OpenLibrary se descartó como segunda fuente porque su `description` casi siempre viene en inglés sin marca de idioma — no aporta cobertura bilingüe.

LibraryThing tiene un modelo de datos llamado **Common Knowledge (CK)** donde cada fact (descripción, resumen, dedicatoria, etc.) tiene un atributo `language`. Esto permite, en teoría, pedir descripción en `spa` o `eng` por separado — justo el match para nuestro flujo bilingüe.

---

## ⚠️ Riesgos críticos antes de empezar

LibraryThing tiene tres bloqueos potenciales que hay que resolver **antes** de escribir código:

1. **API oficialmente "disabled until further notice"** desde enero 2021. El endpoint REST puede o no responder. Hay reportes mixtos en su foro. **No se sabe hasta que se prueba.**
2. **API key requerida.** Se solicita en `librarything.com/services/keys.php`. La página puede estar inactiva o no emitir nuevas keys.
3. **Sin CORS.** El endpoint `librarything.com/services/rest/...` no envía `Access-Control-Allow-Origin`. Llamadas directas desde el navegador fallarán. Soluciones:
   - **Dev:** proxy de Vite en `vite.config.ts`.
   - **Producción:** Firebase Cloud Function (alineado con el resto del backend) o un proxy externo.

Por estos riesgos el plan se divide en fases con **gates de verificación** entre ellas. No se avanza hasta que la fase anterior está validada.

---

## Endpoint a utilizar

**`librarything.ck.getwork`** — devuelve los facts de Common Knowledge para un work.

```
GET https://www.librarything.com/services/rest/1.1/
  ?method=librarything.ck.getwork
  &isbn={isbn}                        # o &id={ltWorkId}
  &apikey={LT_API_KEY}
```

Respuesta: XML. Cada `<fact>` tiene atributo `language` (`spa`, `eng`, `fre`...) y `name` (queremos `description` o `summary`). Ejemplo simplificado:

```xml
<response>
  <ltml>
    <item>
      <commonknowledge>
        <fieldList>
          <field name="description" type="2" displayName="Description">
            <versionList>
              <version language="spa">
                <factList>
                  <fact>Una novela épica de fantasía...</fact>
                </factList>
              </version>
              <version language="eng">
                <factList>
                  <fact>An epic fantasy novel...</fact>
                </factList>
              </version>
            </versionList>
          </field>
        </fieldList>
      </commonknowledge>
    </item>
  </ltml>
</response>
```

Mapeo idioma → `lang` interno: `spa` → `es`, `eng` → `en`. Helper `getLangIso3Letters` ya existe en [langConversion.ts](../../../src/utils/langConversion.ts) y devuelve exactamente este formato.

---

## Plan por fases

### Fase 0 — Prerequisitos (acciones del usuario, sin código)

**No avanzar a Fase 1 hasta que ambos puntos estén validados.**

- [ ] Registrarse en `https://www.librarything.com/services/keys.php` y obtener una API key. Guardarla en `.env.local` como `VITE_LIBRARY_THING_API_KEY`.
- [ ] Smoke test desde terminal:
  ```bash
  curl "https://www.librarything.com/services/rest/1.1/?method=librarything.ck.getwork&isbn=9788401352836&apikey=TU_KEY"
  ```
  Debe responder con XML que contenga `<fact>` (no error 4xx/5xx ni HTML de "API disabled"). Probar con 2-3 ISBNs distintos para confirmar.

**Si Fase 0 falla:** la API no es viable. Volver al plan B (OpenLibrary aceptando que solo aporta EN, o pasar a Hardcover).

---

### Fase 1 — Integración en desarrollo (Vite proxy)

#### 1.1 Variables de entorno

**`.env.local`** (no commit) y **`.env.example`** (commit):
```
VITE_LIBRARY_THING_API_KEY=your_key_here
```

Actualizar la sección "Environment variables" de **`CLAUDE.md`** añadiendo `VITE_LIBRARY_THING_API_KEY`.

---

#### 1.2 Proxy de Vite

**`vite.config.ts`** — añadir bloque `server.proxy`:

```ts
server: {
  proxy: {
    '/api/lt': {
      target: 'https://www.librarything.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/lt/, '/services/rest/1.1'),
    },
  },
},
```

Esto permite que el cliente del navegador haga `GET /api/lt/?method=...` y Vite reenvíe a `librarything.com/services/rest/1.1/?method=...` sin CORS.

---

#### 1.3 Cliente axios

**`src/services/api/apiConnections.ts`** — añadir cliente:

```ts
export const libraryThingClient = axios.create({
  baseURL: '/api/lt',
});
```

Sin header `Content-Type` (consistente con `googleBooksClient`, que daba 503 cuando lo tenía).

---

#### 1.4 Tipos

**`src/types/LibraryThing.ts`** — NUEVO:

```ts
export type LTLanguageCode = 'spa' | 'eng' | string;

export type LTFactVersion = {
  language: LTLanguageCode;
  facts: string[];
};

export type LTField = {
  name: string;          // "description", "summary", "characters", ...
  versions: LTFactVersion[];
};

export type LTWorkCK = {
  fields: LTField[];
};
```

---

#### 1.5 Cliente LibraryThing

**`src/services/api/libraryThingApi.ts`** — NUEVO:

```ts
import { libraryThingClient } from "./apiConnections";
import { getLangIso3Letters } from "@/utils/langConversion";
import type { LTField, LTWorkCK } from "@/types/LibraryThing";
import { logger } from "@/utils/logger";

const API_KEY = import.meta.env.VITE_LIBRARY_THING_API_KEY as string;
const SYNOPSIS_FIELDS = ['description', 'summary'];

function parseCKResponse(xml: string): LTWorkCK | null {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) return null;

  const fields: LTField[] = Array.from(doc.querySelectorAll('field')).map(field => ({
    name: field.getAttribute('name') ?? '',
    versions: Array.from(field.querySelectorAll('version')).map(version => ({
      language: version.getAttribute('language') ?? '',
      facts: Array.from(version.querySelectorAll('fact')).map(f => f.textContent ?? ''),
    })),
  }));

  return { fields };
}

function pickSynopsis(ck: LTWorkCK, lang: string): string {
  const langIso = getLangIso3Letters(lang); // 'es' → 'spa', 'en' → 'eng'

  for (const fieldName of SYNOPSIS_FIELDS) {
    const field = ck.fields.find(f => f.name === fieldName);
    if (!field) continue;
    const version = field.versions.find(v => v.language === langIso);
    const fact = version?.facts.find(f => f.trim().length > 0);
    if (fact) return fact.trim();
  }

  return '';
}

export async function fetchLibraryThingSynopsis(
  isbn: string | undefined,
  lang: string,
  signal?: AbortSignal
): Promise<string> {
  if (!isbn || !API_KEY) return '';

  try {
    const { data } = await libraryThingClient.get<string>('/', {
      params: {
        method: 'librarything.ck.getwork',
        isbn,
        apikey: API_KEY,
      },
      responseType: 'text',
      signal,
    });

    const ck = parseCKResponse(data);
    if (!ck) return '';

    const synopsis = pickSynopsis(ck, lang);
    logger.log(`[LT Synopsis] ${lang}/${isbn}:`, synopsis ? `OK (${synopsis.length} chars)` : 'vacío');
    return synopsis;
  } catch (err) {
    logger.log('[LT Synopsis] error', err);
    return '';
  }
}
```

Notas:
- Usa `DOMParser` (nativo del navegador). No añade dependencias.
- `pickSynopsis` solo devuelve el fact en el `lang` solicitado — si no existe, retorna vacío. Esto es deliberado: queremos que el race rechace esta rama y deje ganar a Google Books.
- Acepta solo lookup por ISBN. Sin ISBN no hay forma fiable de mapear a un work LT (existe `librarything.work.getbookmappings` pero requiere `id` que no tenemos). Si no hay ISBN, retornar `''` para que la rama rechace en el race.

---

#### 1.6 Orquestador del race

**`src/services/api/synopsisSources.ts`** — NUEVO:

```ts
import { fetchGoogleSynopsis } from "./googleBooksApi";
import { fetchLibraryThingSynopsis } from "./libraryThingApi";

const MIN_LENGTH = 50;

async function requireValid(p: Promise<string>): Promise<string> {
  const result = await p;
  if (result.trim().length < MIN_LENGTH) throw new Error('synopsis-too-short');
  return result;
}

export async function fetchSynopsisRace(args: {
  title: string;
  isbn?: string;
  author?: string;
  lang: string;
  signal: AbortSignal;
}): Promise<string> {
  const { title, isbn, author, lang, signal } = args;

  try {
    return await Promise.any([
      requireValid(fetchGoogleSynopsis(title, signal, isbn, author, lang)),
      requireValid(fetchLibraryThingSynopsis(isbn, lang, signal)),
    ]);
  } catch {
    return ''; // AggregateError: ambas rechazaron
  }
}
```

Notas semánticas:
- `Promise.any` resuelve con la **primera no rechazada**. Hoy `fetchGoogleSynopsis` devuelve `''` cuando falla — sin el wrapper `requireValid` esa cadena vacía "ganaría" y descartaríamos LT aunque tuviera datos. El wrapper convierte vacíos en rechazos.
- `fetchLibraryThingSynopsis` ya devuelve `''` cuando no hay fact en el idioma pedido — `requireValid` lo rechaza y solo cuenta Google Books para esa rama.
- `AbortSignal` se comparte. Si una gana, la otra sigue volando hasta completarse pero su resultado se descarta. Aceptamos el coste (responses < 5 KB).

---

#### 1.7 Integrar en `useBookDetail`

**`src/hooks/useBookDetail.ts`** — tres cambios:

**Cambio A — flujo principal (líneas 89-119):** sustituir `fetchGoogleSynopsis` por `fetchSynopsisRace`:

```ts
const fetched = await fetchSynopsisRace({
  title: langTitle ?? workKey,
  isbn: langIsbn ?? bookFromState?.isbn,
  author: bookFromState?.authors?.[0],
  lang,
  signal: controller.signal,
});
```

**Cambio B — flujo `otherLang` (líneas 142-160):** corregir el bug del título vacío + usar el race. El bug está parcialmente documentado en `2026-05-02-language-cache-bugs.md` (BUG 1):

```ts
const otherLang = lang === 'es' ? 'en' : 'es';
getSynopsisFromDB(workKey, otherLang).then(async otherCached => {
  if (otherCached && otherCached.trim().length > 0) return;

  // Resolver título/isbn del otro idioma si faltan
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

  if (!otherTitle) return;

  const otherSynopsis = await fetchSynopsisRace({
    title: otherTitle,
    isbn: otherIsbn,
    author: bookFromState?.authors?.[0],
    lang: otherLang,
    signal: controller.signal,
  });

  if (otherSynopsis.trim().length > 0) {
    saveSynopsisToDB(workKey, otherSynopsis, otherLang);
  }
}).catch(() => {});
```

**Cambio C — bug ortogonal (líneas 127, 134):** título e isbn no respetan `lang` actual:
```ts
title: bookFromState?.titles?.[lang] ?? bookFromState?.title ?? '',
...
isbn: bookFromState?.isbns?.[lang] ?? bookFromState?.isbn ?? '',
```

**Imports:**
- Eliminar `import { fetchGoogleSynopsis } from "@/services/api/googleBooksApi";`
- Añadir `import { fetchSynopsisRace } from "@/services/api/synopsisSources";`

---

#### 1.8 Limpieza menor en Google Books

**`src/services/api/googleBooksApi.ts`** — eliminar el código muerto del intento 3 (líneas 218-230). Ahora el papel de "fallback más laxo" lo cumple LibraryThing.

---

#### 1.9 Actualizar docs de arquitectura

**`docs/superpowers/plans/2026-04-28-api-architecture.md`**:

Tabla de "Estrategia de caché por tipo de dato" — fila Sinopsis:

| Dato | Cache 1 | Cache 2 | Fuente |
|---|---|---|---|
| Sinopsis | Firestore | — | **Google Books ⊕ LibraryThing (Promise.any)** |

Añadir bajo "APIs externas":
```
### LibraryThing (`src/services/api/libraryThingApi.ts`)
- Synopsis: GET /services/rest/1.1/?method=librarything.ck.getwork&isbn=X
- Devuelve XML con facts por idioma (spa/eng) — campo `description` o `summary`
- Vía proxy `/api/lt` en dev (Vite), Cloud Function en producción (pendiente)
- Requiere `VITE_LIBRARY_THING_API_KEY`
```

---

### Gate Fase 1 → Fase 2

Antes de pasar a Fase 2, validar manualmente en `npm run dev`:
- [ ] Libro con sinopsis solo en Google Books: aparece igual que antes.
- [ ] Libro sin sinopsis en Google Books pero con CK en LT (probar con clásicos: *Don Quijote* ISBN `9788424116835`, *El Nombre del Viento* `9788401352836`): aparece la sinopsis de LT en el idioma correcto.
- [ ] `lang='es'` recibe texto en español; `lang='en'` recibe texto en inglés. Si LT no tiene el idioma pedido, gana Google Books.
- [ ] Cambio de idioma en BookDetailPage re-fetchea correctamente.
- [ ] Logs `[LT Synopsis]` aparecen en consola sin errores CORS ni 4xx.

Si algo falla (especialmente CORS o API key inválida), no continuar a Fase 2 hasta resolverlo.

---

### Fase 2 — Producción (pendiente, fuera del alcance inicial)

El proxy de Vite **solo funciona en `npm run dev`**. En `npm run build` el bundle apuntará a `/api/lt` que no existe en producción.

Opciones para producción (a decidir más tarde):

1. **Firebase Cloud Function** (`functions/src/ltProxy.ts`): función HTTPS que reenvía a LibraryThing con la API key oculta server-side. Endpoint público `https://us-central1-{project}.cloudfunctions.net/ltProxy?isbn=X&lang=Y`. Ventaja: API key no expuesta en cliente, mismo ecosistema Firebase. Coste: setup de Functions si no estaban activas.

2. **Hosting rewrite con función**: `firebase.json` con `rewrites` apuntando `/api/lt/**` a una Cloud Function. Mantiene la URL relativa idéntica entre dev y prod.

3. **CORS proxy externo** (corsproxy.io, allorigins.win): no recomendado en producción — fragilidad y sin SLA.

Hasta resolver Fase 2, **el cambio NO debe llegar a `main`**. Puede vivir en una rama de feature mientras se prueba en local.

---

## Riesgos y consideraciones

1. **API potencialmente caída.** Mayor riesgo del plan. Fase 0 mitiga: si el smoke test falla, no se gasta tiempo en código.
2. **Cobertura CK incompleta.** Common Knowledge es editada por usuarios — solo libros populares tienen `description` en múltiples idiomas. Para libros de nicho, LT rechazará y ganará Google Books (= comportamiento actual).
3. **API key expuesta en cliente (Fase 1).** En dev no es problema. En producción debe ir vía Cloud Function.
4. **Cancelación parcial.** Cuando una rama del race gana, la otra sigue en vuelo y su respuesta se descarta. No hay efectos secundarios — los fetchers no escriben en disco.
5. **DOMParser solo funciona en navegador.** Si en el futuro corremos esto en SSR/Cloud Function (Node), habrá que cambiar a `fast-xml-parser` o similar. Hoy no aplica.

---

## Tareas pendientes que NO entran en este plan

Detectadas en revisión pero ortogonales al multi-source:

- (a) Doble ciclo de efecto en `useAuthorData` y `useBookRecommendations` cuando `book` aún es `null`.
- (d) `useBookRecommendations` reescribe `saveBooksToDB` cada fallback sin TTL.
- (f) `loading` en `useBookDetail` no se resetea al cambiar `lang` — la sinopsis vieja se ve hasta que llega la nueva.
- (g) `saveBooksToDB` en `useAuthorData` se dispara fire-and-forget sin condicional.
- Sin deduplicación de `fetchWorkEditionByLang` cuando varios hooks piden el mismo workKey simultáneamente.

---

## Acceptance criteria (Fase 1)

- [ ] Fase 0 verificada (API key obtenida, smoke test OK).
- [ ] Variable `VITE_LIBRARY_THING_API_KEY` en `.env.local` y `.env.example`. `CLAUDE.md` actualizado.
- [ ] Proxy de Vite configurado.
- [ ] `libraryThingApi.ts`, `synopsisSources.ts` y `LibraryThing.ts` creados.
- [ ] `useBookDetail.ts` migrado al race + bugs B y C corregidos.
- [ ] Código muerto del intento 3 de Google Books eliminado.
- [ ] `npm run build` y `npm run lint` pasan.
- [ ] Validación manual de los 5 puntos del Gate Fase 1 → Fase 2.
- [ ] Doc `2026-04-28-api-architecture.md` actualizado.
