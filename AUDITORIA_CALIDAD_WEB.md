# 📚 Auditoría de calidad web — Book Project (Trama)

**Rama auditada:** `feat-custom-lists` (la más adelantada del repo)
**Fecha:** 19 de mayo de 2026
**Herramientas usadas:** Google Lighthouse (desktop + mobile), Chrome DevTools, análisis estático, npm audit.

---

## 🎉 Lo primero: habéis mejorado MUCHO

Antes de entrar en detalle, quiero ponerlo por escrito: comparado con `refactor/design-tokens` (la rama anterior), esta entrega es **otro nivel**. No es una mejora incremental, es un salto cualitativo. Voy a empezar por todo lo que habéis resuelto y añadido.

### Cosas que estaban señaladas en el reporte anterior y ahora funcionan ✅

| Tema | Antes | Ahora |
|---|---|---|
| `<html lang>` dinámico | Estático `"en"` | Se actualiza con i18n (`App.tsx:42-47`) |
| Meta `description` | Ausente | Presente en `index.html:8` |
| Open Graph / Twitter Card | Ausente | Implementado completo (`index.html:10-18`) |
| `<title>` | "Book Project Base" | "Trama — Tu compañera de lectura" |
| Favicon | `vite.svg` por defecto | `favicon.svg` propio |
| `robots.txt` | No existía | Existe en `public/robots.txt` con sitemap |
| Logo Google externo | Dependía de `gstatic.com` | Local en `public/google-logo.svg` |
| Fuentes | Manrope 200..800 (todo) | Manrope 400;600;700 + Libre Baskerville (solo lo que se usa) |
| `<label>` en formularios | Solo placeholder | `<label htmlFor>` + id + texto persistente |
| `ErrorBoundary` global | No existía | `src/components/common/ErrorBoundary.tsx` envolviendo toda la app |
| `console.log` en producción | 5+ logs en runtime | Migrados a `logger.log` con guard `import.meta.env.DEV` |
| Dependencias críticas | 1 critical + 3 high | 0 critical + 0 high (solo low/moderate transitivas) |
| Build de producción casing | Rompía por `Auth/` vs `auth/` | Estructura normalizada en minúscula |

### Cosas que NO os pedí y aún así habéis añadido — esto es lo que diferencia a un equipo bueno de uno excelente

- **Skeletons de carga** (`BookInfoCardSkeleton`, `AuthorSectionSkeleton`) — UX mucho más profesional que un spinner.
- **Tests con Vitest** (`Searchbar.test.tsx`, `BookInfoCard.test.tsx`, `logger.test.ts`). Tener tests en un proyecto de clase no es habitual; lo habéis hecho.
- **`ThemeContext` + `PreferencesContext`** — habéis pensado en sistema de tema y preferencias del usuario.
- **`NavbarMini` con scroll-aware** — la navbar se transforma al hacer scroll (`App.tsx:14-28`). Detalle de producto, no de proyecto de clase.
- **`aria-haspopup` y `aria-expanded`** en el menú de perfil (`Navbar.tsx:73-74`) — accesibilidad de menú correctamente implementada.
- **Iconos con `lucide-react`** — adiós a 8 PNGs sueltos en `assets/`. Consistencia visual y bundle más pequeño.
- **Reorganización de carpetas por dominio** (`auth/`, `book/`, `shelf/`, `profile/`, `layout/`, `common/`, `explore/`). La arquitectura escala mucho mejor que componentes en plano.
- **`<input type="search">` con `role="search"`** en la búsqueda de la navbar — semánticamente perfecto.
- **Refactor del sistema de listas en BBDD** (4 commits ahead de main) — feature compleja en curso.

Tomáos un momento para mirar este listado. **Es vuestro trabajo.** Continúa el documento ahora con lo que toca pulir, pero el punto de partida ya es muy bueno.

---

## 📈 Scores Lighthouse — comparativa con el reporte anterior

| Categoría | Antes (desktop) | Ahora (desktop) | Antes (mobile) | Ahora (mobile) |
|---|---|---|---|---|
| Accessibility | 93 | **91** ↓ | 100 | **100** ✅ |
| Best Practices | 77 | **77** = | 77 | **77** = |
| SEO | 83 | **100** 🎉 ↑ | 82 | **100** 🎉 ↑ |
| Agentic Browsing* | — | 33 | — | 67 |

> *Agentic Browsing es una categoría **nueva** de Lighthouse (2026), evalúa cómo entienden la página los agentes de IA. No existía cuando hicimos el reporte anterior.

**Lectura rápida:** SEO subió 17 puntos por las meta tags. Accessibility mobile sigue al máximo. La leve bajada en a11y desktop (93→91) es por dos cosas nuevas que veremos a continuación, no por regresión de lo anterior.

**Performance:** LCP de 396 ms y CLS de 0.00 en dev server. Excelente.

---

## 🗺️ Recorrido por las páginas internas

Esta vez probé el flujo logeado completo. Aquí está el resumen — útil para saber dónde mirar primero.

| Ruta | Estado | Notas |
|---|---|---|
| `/` (Landing) | ✅ Funciona | Redirige a my-library si autenticado |
| `/explore` | ✅ Funciona perfecto | Buena estructura semántica, imágenes con alt, headings ok |
| `/books/:id` | ✅ Funciona | Layout profesional, reviews, autor, recomendaciones. Warning de `src=""` |
| `/my-library` | ⚠️ **Crashea** | ErrorBoundary lo captura (¡bien!) — fallo de `ListCard` |
| `/my-library/shelf` | ✅ Funciona | Estanterías con filtros y búsqueda |
| `/profile` | ⚠️ **Crashea** | Mismo bug de `ListCard` |
| `/profile/edit` | ✅ Funciona | Formulario completo, falta `autocomplete` |
| `/profile/:userId` y `/u/:username` | No probadas | Existen en `routes.tsx` |
| `/community` | ✅ Placeholder | "Próximamente" — esperado |
| `/settings` | ✅ Funciona | Solo una preferencia hasta el momento |
| `/style-guide` | ❌ 404 | La carpeta existe en `src/pages/style-guide/` pero **no está en `routes.tsx`** |

**Lo que me llamó la atención positivamente:** cuando una página crashea, el ErrorBoundary global cumple su función — el usuario ve "Algo ha fallado. Recarga la página." en lugar de pantalla blanca. Esto es exactamente para lo que se diseñó. Sin ese boundary, una excepción en `ListCard` te tira la app entera y te quedas sin debug context.

---

## 🧭 Qué nos queda por pulir

Estructura igual que la última vez: **qué pasa → por qué importa → cómo lo arregláis → 💡 aprendizaje**.

---

## 1. El build de producción sigue fallando (esta vez por otro motivo)

### Qué pasa
`npm run build` falla con 4 errores de TypeScript:

```
src/components/shelf/sections/ListsSection.tsx(3,15): error TS2614:
  Module '"@/components/shelf/cards/ListCard"' has no exported member 'ReadingList'.

src/components/shelf/sections/ListsSection.tsx(28,12): error TS2741:
  Property 'userId' is missing in type '{ key: any; list: ReadingList; }'
```

Y dos imports más con el mismo error en `MyLibraryPage.tsx:4` y `ProfilePage.tsx:13`.

### Por qué pasa esto
Habéis hecho un refactor en `ListCard.tsx`: antes exportabais un tipo `ReadingList`, ahora usáis `BookList` (en `@/types/BookList`) y `ListCard` recibe una prop nueva (`userId`). Tres archivos siguen importando el tipo antiguo y llamando al componente sin pasar `userId`.

Esto es muy típico: **refactor a medias**. Habéis renombrado en un sitio pero no habéis seguido el rastro de quién lo consume.

### Cómo lo arregláis
1. En `ListsSection.tsx:3`, `MyLibraryPage.tsx:4` y `ProfilePage.tsx:13`: cambiar
   ```ts
   import { ReadingList } from "@/components/shelf/cards/ListCard";
   ```
   por
   ```ts
   import type { BookList } from "@/types/BookList";
   ```
2. En `ListsSection.tsx:28` (y donde uséis `<ListCard list={...}>` sin `userId`): pasar la prop `userId`. Probablemente venga del contexto de auth.

3. **Antes del próximo merge**, ejecutad `npm run build` localmente. Es la red de seguridad que no debéis saltaros.

### 💡 Aprendizaje
Truco mental: **"si renombras o cambias la API de un componente, busca todos sus consumidores antes de cerrar el cambio"**. VS Code tiene "Find All References" con `Shift+F12`. Y un commit con build verde es siempre mejor que uno con build roto + un "ya lo arreglaré".

### Bonus: este mismo bug es lo que tira `/my-library` y `/profile` en runtime
Cuando navego a esas rutas autenticado, React lanza `TypeError: Cannot read properties of undefined (reading 'map')` desde `ListCard`. Es decir, **el bug no es solo de compilación**: se manifiesta también en producción si entras a esas páginas. La cuenta que estoy usando para probar tiene listas vacías o malformadas y `list.books`/`list.coverUrls` viene undefined cuando `ListCard` espera un array.

Cuando arregléis el refactor, comprobad que `getListCoverUrls(list.books)` o el componente directamente maneja el caso de "lista vacía" sin reventar:

```tsx
// dentro de ListCard
const covers = list.books?.length ? getListCoverUrls(list.books) : [];
```

---

## 2. El link del avatar no tiene nombre accesible (cuando no estás autenticado)

### Qué pasa
En `Navbar.tsx:80-83`:

```tsx
<NavLink to="/auth" className="navbar__btn-icon navbar__btn-icon--avatar">
  <User size={18} />
</NavLink>
```

El icono `<User>` es solo un SVG decorativo. El enlace **no tiene texto visible ni `aria-label`**. Para un lector de pantalla, este enlace se anuncia como "enlace" a secas — sin saber a dónde lleva.

Lighthouse lo detecta como `link-name` failed.

### Por qué importa
Es uno de los errores de accesibilidad **más graves** según WCAG (criterio 2.4.4: "Link Purpose"). Para alguien que navega con lector de pantalla, este enlace es invisible en propósito.

Curiosamente, justo arriba (línea 64-66) sí lo hacéis bien:
```tsx
<button aria-label={t("navbar.notifications")}>
  <Bell />
</button>
```

Es el mismo patrón, solo que en uno se os ha pasado.

### Cómo lo arregláis
```tsx
<NavLink
  to="/auth"
  className="navbar__btn-icon navbar__btn-icon--avatar"
  aria-label={t("navbar.signIn")}  // o el key que useis
>
  <User size={18} />
</NavLink>
```

### 💡 Aprendizaje
Regla mental: **"si un enlace o botón contiene SOLO un icono, necesita `aria-label`. Sin excepciones."** Es tan automático que en cuanto escribís `<button>` o `<NavLink>` con un solo hijo SVG, vuestro reflejo debe ser teclear `aria-label`. Configurad ESLint con `jsx-a11y/anchor-has-content` para que os avise.

---

## 3. Contraste de los links de navegación (mejorado, pero aún corto)

### Qué pasa
Los enlaces `.navbar__link` ("My Library", "Explore", "Community") usan color `#838178` sobre fondo blanco. Contraste: **3.9:1**. WCAG AA pide 4.5:1 para texto normal.

### Por qué importa esta vez
Antes (rama anterior) el contraste era 2.71:1. Ahora 3.9:1. **Os ha faltado poquísimo** — habéis subido más de un punto. Es justo el tipo de detalle que se nota cuando rediseñáis: a ojo se ve "gris elegante", pero a la luz del sol en un móvil pierde legibilidad.

### Cómo lo arregláis
Tres opciones, de menos a más invasivas:

1. **Oscurecer el gris:** `#6a685f` da 5.9:1, sigue siendo gris suave.
2. **Aumentar el peso de fuente:** texto normal pide 4.5:1, **bold pide 3:1**. Si los enlaces ya son `font-weight: 600`, técnicamente cumplís (Lighthouse usa la regla estricta).
3. **Subir el tamaño:** texto "grande" (18px+ regular o 14px+ bold) solo pide 3:1.

La opción 1 es la más segura para mantener consistencia visual.

### 💡 Aprendizaje
Memorizad estos tres ratios: **4.5:1 (texto normal), 3:1 (texto grande/bold), 3:1 (componentes UI / iconos)**. Cuando elijáis un color, comprobadlo en [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker/) **antes** de añadirlo al design system. Después es más doloroso.

---

## 4. `<article onClick>` en BookCard y BookTile

### Qué pasa
`BookCard.tsx:70-73`:
```tsx
<article
  className={`book-card${dropdownOpen ? " book-card--open" : ""}`}
  onClick={handleCardClick}
>
```

`BookTile.tsx:18`:
```tsx
<article className="book-tile" onClick={() => navigate(...)} style={{ cursor: "pointer" }}>
```

Es el mismo patrón del reporte anterior. La parte que ya hacéis bien es que los **botones internos** (`save-btn`, `dropdown-item`) sí son `<button>` con `stopPropagation`, así que el dropdown funciona correctamente. Pero la card en sí no es interactiva para teclado.

### Por qué sigue importando
Un usuario con teclado:
- `Tab` por la página → llega al botón de guardar de la card, **pero no a la card en sí**.
- No puede abrir el detalle del libro sin ratón.

Esto es accesibilidad básica (WCAG 2.1.1: Keyboard).

### Cómo lo arregláis
La conversión más limpia es envolver el contenido **navegable** en un `<Link>`:

```tsx
<article className="book-card">
  <Link
    to={`/books/${encodeKey(book.key)}`}
    state={{ book }}
    className="book-card__main-link"
  >
    <div className="book-card__cover-wrapper">{/* portada */}</div>
    <div className="book-card__info">{/* titulo, autor, rating */}</div>
  </Link>

  {/* el botón de guardar fuera del Link, en su propio wrapper */}
  <div className="book-card__save-wrapper" ref={wrapperRef}>
    {/* ... */}
  </div>
</article>
```

CSS-wise, el `<Link>` se estira al tamaño de la card con `display: block; height: 100%`. Y el botón de guardar va con `position: absolute` flotando encima.

### 💡 Aprendizaje
Repaso de la regla de la auditoría anterior porque sigue aplicando: **"navego a otra URL → `<Link>`. Hago una acción sin cambiar URL → `<button>`. Nunca `<div onClick>`."** El `cursor: pointer` que ponéis manualmente con style inline es la señal: si estáis poniendo cursor pointer a un div, casi seguro que querríais un `<a>` o `<button>`.

---

## 5. `llms.txt` — algo nuevo en Lighthouse 2026

### Qué pasa
Lighthouse ahora audita la presencia de un archivo `/llms.txt`. Vuestro proyecto no lo tiene y aparece como failed.

### Por qué importa (y por qué tampoco es urgente)
`llms.txt` es una propuesta reciente (~2025) para que **los agentes de IA** entiendan vuestra página. Es a los crawlers de Claude / ChatGPT / Perplexity lo que `robots.txt` es a Googlebot.

Aún no es estándar, pero Lighthouse ya lo evalúa. Para un proyecto que se llama Trama (descubrir libros), pensad si tener buen ranking en respuestas de IA tiene sentido.

### Cómo lo arregláis (si decidís hacerlo)
Crear `public/llms.txt`:

```
# Trama

Compañera de lectura: descubre, organiza y comparte los libros que dan forma a tu mundo.

## Rutas principales

- [Explorar libros](https://trama.com/explore): catálogo y recomendaciones.
- [Mi biblioteca](https://trama.com/my-library): estanterías personales del usuario.
- [Detalle de libro](https://trama.com/books/{id}): sinopsis, valoraciones y autor.

## Idiomas

Disponible en español e inglés (detección automática del navegador).
```

Especificación oficial: [llmstxt.org](https://llmstxt.org/)

### 💡 Aprendizaje
La web cambia rápido. Estándares nuevos aparecen cada año. **Lighthouse es vuestro "noticiero" pasivo**: cuando os marca algo que no conocíais, vale la pena buscar qué es. No es obligatorio implementarlo todo, pero saber que existe os pone por delante.

---

## 6. Hallazgos en las páginas internas (lo que vi con sesión iniciada)

Cosas que solo se ven al recorrer la app logeado. Las dejo en una sola sección porque son pequeñas.

### 6.1. Warning de React: `src=""` vacío en imágenes

Al cargar `/books/OL18016709W` (Fire & blood):

```
An empty string ("") was passed to the `src` attribute.
This may cause the browser to download the whole page again over the network.
```

Buscad un `<img src="">` o `<img src={url || ""}>`. El bug típico es:

```tsx
// ❌ mal — si url es undefined, src=""
<img src={url || ""} alt="..." />

// ✅ bien — render condicional
{url && <img src={url} alt="..." />}

// ✅ alternativa — undefined permitido pero string vacía no
<img src={url || undefined} alt="..." />
```

Probable culpable: `BookTile.tsx:13-25`, donde `coverSrc` puede ser `null` pero se renderiza la cadena vacía si pasa por algún `||""` intermedio. Inspeccionad también `BookCard.tsx:67`.

**Por qué importa:** un `src=""` hace que el navegador re-pida la URL de la página actual creyendo que es la imagen. Es una request fantasma y un error visible en consola.

---

### 6.2. Inputs sin `autocomplete` en `/profile/edit`

Lighthouse marca 2 inputs sin atributo `autocomplete` en la página de editar perfil (Nombre y Apellido).

```tsx
// Nombre
<input type="text" name="firstName" autoComplete="given-name" />

// Apellido
<input type="text" name="lastName" autoComplete="family-name" />

// Email (si lo añadís)
<input type="email" name="email" autoComplete="email" />

// Username/nickname
<input type="text" name="username" autoComplete="username" />

// Bio (sin autocomplete)
<textarea autoComplete="off" />
```

**Por qué importa:** el navegador rellena automáticamente formularios con datos conocidos del usuario (nombre, dirección, etc.). Sin `autocomplete`, esa función se rompe. Y a un usuario con dificultad motora, autocomplete es accesibilidad pura.

Lista completa de valores válidos: [MDN — HTML autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete).

---

### 6.3. Página `style-guide` huérfana

Existe la carpeta `src/pages/style-guide/` pero no está registrada en `routes.tsx`. Navegar a `/style-guide` da 404.

Dos opciones:
1. **Si la queréis accesible** (probablemente solo en dev): añadidla a `routes.tsx`. Útil para el equipo, no para usuarios finales.
2. **Si está obsoleta**: borrad la carpeta. Código muerto en `src/` confunde.

Si la mantenéis, considerad protegerla:
```tsx
{
  path: "style-guide",
  element: import.meta.env.DEV ? <StyleGuide /> : <Navigate to="/" />,
}
```

---

### 6.4. `useBookDetail` se ejecuta varias veces en el detalle de libro

Al entrar a `/books/:id` veo 6 pares de `logger.log('location.state:', ...)` y `logger.log('bookFromState:', ...)`. Eso significa que el hook se está ejecutando 6 veces en una sola navegación.

Lo más probable: un `useEffect` cuyas dependencias incluyen un objeto/array nuevo cada render, lo que lo dispara siempre. O un context cambiando de identidad. Revisad `useBookDetail.ts:24-25`.

**Por qué importa:** cada ejecución dispara potencialmente fetches duplicados a OpenLibrary / Google Books. Coste API y UX más lenta.

**Cómo diagnosticarlo:** quitad temporalmente las deps del useEffect y ved si baja a 1-2 ejecuciones. Memoizad lo que cambie de identidad con `useMemo`.

---

### 6.5. `[Object object]` en consola

Sigue habiendo `logger.log(result)` en `ShelfContext.tsx:190` y otros que imprimen objetos sin contexto. Como ya están en `logger`, solo aparecen en dev — pero llenar la consola de objetos sin saber qué son hace difícil debuggear cosas reales.

Patrón mejor:
```ts
logger.log("[ShelfContext] addBook result:", result);
```

Prefijo de módulo + qué representa = log útil. Ya lo hacéis bien en `useExploreBooks` (`"[Explore] ..."`) — extendedlo.

---

## 7. Algunas observaciones menores

Resumidas, no merecen sección entera pero las apunto:

- **`og:image` apunta a `/src/assets/logo.png`** (`index.html:14`). El comentario ya os recuerda que falta una imagen 1200×630. Crearla. Cuando alguien comparta vuestra URL en WhatsApp, ese png pequeño se verá cortado.
- **`og:url` apunta a `https://trama.com`** que aún no es vuestro dominio real. Si vais a desplegar, cambiadlo o quitadlo.
- **Sitemap del `robots.txt`** apunta también a trama.com — generar un `sitemap.xml` real (Vite tiene plugins para ello, ej. `vite-plugin-sitemap`).
- **`ProfilePage`, `BookCard`, etc. usan `useShelf`, `useAuth`** — está bien, pero verificad que los contextos manejen el caso "no autenticado" sin pedir login (vi flujo de tooltip en `BookCard:48-51`, perfecto).
- **`firebase-admin` está en `devDependencies`** — bien, así no entra al bundle del cliente. Sus 8 CVEs low/moderate solo afectan a vuestros scripts locales (`backfill-*.cjs`).
- **`brace-expansion` moderate** — transitive. `npm audit fix` la resuelve.
- **9 vulnerabilidades totales** vs las 7 anteriores, pero **0 críticas y 0 altas** vs las 1+3 anteriores. Es una mejora enorme: bajada de severidad.

---

## 📋 Plan de acción sugerido

### Esta semana — desbloquear el deploy
1. Arreglar los 4 errores de TypeScript en `ListsSection`, `MyLibraryPage`, `ProfilePage` (ver punto 1). **Esto desbloquea también `/my-library` y `/profile` en runtime**.
2. Añadir `aria-label` al `NavLink` del avatar (ver punto 2).
3. Arreglar el `src=""` vacío en cards (ver punto 6.1).
4. `npm audit fix` para limpiar las low.

### Sprint siguiente — refinar a11y y UX
5. Subir el contraste del gris de los links de navbar.
6. Convertir `BookCard` y `BookTile` para que sean navegables por teclado.
7. Añadir `autocomplete` a los inputs de `/profile/edit` (ver punto 6.2).
8. Investigar el re-render múltiple de `useBookDetail` (ver punto 6.4).
9. Decidir qué hacer con `pages/style-guide/` huérfana (ver punto 6.3).

### Cuando os apetezca — opcionales
10. Decidir si implementáis `llms.txt`.
11. Generar la imagen Open Graph 1200×630.
12. Cambiar dominios placeholder en `og:url` y `robots.txt` cuando tengáis dominio real.
13. Considerar un `sitemap.xml` automático.
14. Estandarizar prefijos en `logger.log` (ver punto 6.5).

---

## 🎓 Para profundizar

- [Lighthouse: Link does not have a discernible name](https://developer.chrome.com/docs/lighthouse/accessibility/link-name) — la regla concreta del punto 2.
- [web.dev — Make navigation easy](https://web.dev/learn/accessibility/navigation) — capítulo del curso oficial.
- [The new llms.txt standard](https://llmstxt.org/) — propuesta para crawlers de IA.
- [WCAG 2.2 — Contrast Minimum (1.4.3)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) — la definición oficial de 4.5:1.
- [vite-plugin-sitemap](https://www.npmjs.com/package/vite-plugin-sitemap) — si os animáis con sitemap automático.

---

## ✨ Cierre

Cuando hicimos la primera auditoría había 3 problemas críticos, 5 de prioridad alta y un build roto. Hoy hay 1 build roto (por un refactor a medias, no por casing), 1 link sin aria-label, y mejoras de pulido. **El proyecto ha madurado mucho**.

Hay algo que tenéis que saber: la mayoría de equipos que reciben un reporte de auditoría implementan el 30-40% de los puntos. Vosotros habéis implementado **prácticamente el 100%**, y además habéis añadido tests, skeletons, sistema de tema y preferencias. Eso es una actitud de equipo serio.

Las cosas que quedan no son grandes. Son finos. Y los finos son los que separan "esto funciona" de "esto se nota profesional".

Seguid así. De verdad.
