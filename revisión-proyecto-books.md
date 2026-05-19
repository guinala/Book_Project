# Revisión web — Book Project (Trama)

> El objetivo no es puntuar, sino **aprender** qué prácticas elevan un proyecto de bueno a excelente.

**Fecha:** 18 de abril de 2026
**Herramientas usadas:** Google Lighthouse (desktop + mobile), Chrome DevTools, análisis estático de código, npm audit.

---

## Antes de empezar: vuestro punto de partida

Habéis construido algo sólido. Estas son cosas que ya hacéis bien y que merece la pena destacar porque **son hábitos profesionales**:

- ✅ **Usáis design tokens** (variables CSS) en lugar de valores hardcoded. Esto es exactamente lo que se hace en equipos de producto.
- ✅ **Componentes con responsabilidad clara** (`BookCard`, `AuthorSection`, `SearchBar`…). La arquitectura es legible.
- ✅ **Internacionalización desde el día uno** con `i18next`. Muchos equipos senior lo añaden tarde y duele.
- ✅ **`loading="lazy"` en imágenes de cards**. Ya pensáis en performance.
- ✅ **`aria-label` en botones de icono** (notificaciones, perfil, búsqueda). Es accesibilidad de verdad.
- ✅ **`<article>` semántico** en `BookCard` en vez de `<div>`.
- ✅ **Diálogo con `role="dialog"` y `aria-modal="true"`** en `SynopsisModal`. Perfecto.
- ✅ **Mapeo de errores Firebase a mensajes traducidos**. Detalle de producto maduro.
- ✅ **Formularios con `react-hook-form`** y estado de envío (`isSubmitting`). Profesional.

Sobre esta base vamos a repasar **qué podemos pulir y por qué**.

---

## Resultados Lighthouse

| Categoría | Desktop | Mobile |
|---|---|---|
| Accessibility | 93 / 100 | 100 / 100 🎉 |
| Best Practices | 77 / 100 | 77 / 100 |
| SEO | 83 / 100 | 82 / 100 |

Mobile accessibility al 100 es un resultado excelente. Las áreas de mejora son Best Practices y SEO, y son **totalmente abordables**.

---

## Cómo leer este documento

Cada punto tiene:
- **Qué pasa** — descripción neutra
- **Por qué importa** — el motivo educativo, no solo "arréglalo"
- **Cómo lo arregláis** — ejemplo de código o pasos

Los puntos están agrupados por **orden de aprendizaje**, no por severidad pura.

---

## 1. El build de producción no compila (tema de fundamentos de build)

### Qué pasa
Al ejecutar `npm run build` aparecen errores de tipo `TS1261` y `TS1149`:

```
File name '.../components/Auth/Form_Components/FormInput.tsx' differs from
already included file name '.../components/auth/Form_Components/FormInput.tsx'
only in casing.
```

### Por qué importa
Este es un bug **invisible en Windows** y **fatal en Linux/macOS/servidores de deploy**.

Windows es *case-insensitive*: para el sistema de archivos `Auth` y `auth` son la misma carpeta. Pero TypeScript (y Linux) son *case-sensitive*. Cuando importáis:

```ts
import FormInput from "@/components/Auth/Form_Components/FormInput";   // ❌ mayúscula
import FormInput from "@/components/auth/Form_Components/FormInput";   // ✅ minúscula
```

TypeScript piensa que son dos archivos distintos y se queja. En dev con Vite no falla porque Windows resuelve ambos, pero **casi ningún servidor de deploy va a levantar esto**.

### Cómo lo arregláis
1. Buscad todos los imports que usen `components/Auth/` (mayúscula) y cambiadlos a `components/auth/`.
2. Archivos afectados: `LoginForm.tsx:7-9`, `RegisterForm.tsx:8-10`, `AuthPage.tsx:4`.
3. Después corregid el tipo en `services/api/googleBooksApi.ts:85`:

```ts
// El tipo Book espera `cover_url?: string` (string | undefined)
// pero estáis devolviendo `string | null`. Uno de los dos debe ceder.
cover_url: book.cover_url ?? undefined,  // convertir null a undefined
```

### Regla de oro
todas las carpetas y archivos en minúscula (`kebab-case` o `camelCase`), sin excepciones. Configurad ESLint con la regla `import/no-case-sensitive-paths` para que salte antes.

---

## 2. Formularios sin `<label>` (accesibilidad fundamental)

### Qué pasa
En `FormInput.tsx` el input solo tiene `placeholder`:

```tsx
<input
  type={type}
  placeholder={placeholder}
  aria-invalid={error ? "true" : undefined}
  {...registration}
/>
```

### Por qué importa
El `placeholder` **desaparece** cuando el usuario empieza a escribir. Si alguien con dificultad visual vuelve al formulario a revisar, ya no sabe qué campo es cuál. Además, los lectores de pantalla no siempre anuncian el placeholder.

La WCAG 2.2 (criterio 3.3.2) exige que cada input tenga una etiqueta persistente.

### Cómo lo arregláis

**Opción A: Label visual (mejor UX):**
```tsx
export default function FormInput({ id, label, type, error, registration }) {
  return (
    <>
      <label htmlFor={id} className="auth__label">{label}</label>
      <input
        id={id}
        type={type}
        aria-invalid={error ? "true" : undefined}
        {...registration}
      />
      {error && <p className="auth__error" role="alert">{error.message}</p>}
    </>
  );
}
```

**Opción B: Label oculto visualmente (mantiene diseño con placeholder):**
```tsx
<label htmlFor={id} className="sr-only">{label}</label>
<input id={id} placeholder={placeholder} ... />
```

Con `.sr-only` en CSS:
```scss
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Lo que hemos visto en clase
Un `<input>` sin `<label>` asociado es el error de accesibilidad más común. Toda app profesional lo debe cumplir. No cuesta nada y es inclusivo.

---

## 3. Contraste de color insuficiente en el navbar

### Qué pasa
Lighthouse detecta dos textos con contraste por debajo del mínimo:
- `.navbar__brand-name` "Trama": **3.19:1** — blanco sobre `#e86b30` (naranja acento)
- `.navbar__link` (My Library, Explore, Community): **2.71:1**

El mínimo WCAG AA es **4.5:1** para texto normal.

### Por qué importa
1 de cada 12 personas tiene algún grado de daltonismo. En condiciones de luz solar directa (muy común en móvil) un contraste de 3:1 se vuelve prácticamente ilegible.

Además, vuestra navbar es el primer punto de contacto. Si ahí no se lee bien, el resto da igual.

### Cómo lo arregláis
Opciones ordenadas de menor a mayor impacto visual:

1. **Oscurecer el acento** — probad `#c44f1a` o `#b04415`. Mantiene la identidad y pasa a 4.5:1.
2. **Subir el peso del link inactivo** — está en `rgba(255,255,255,0.85)`. Pasad a `rgba(255,255,255,1)` y el active a un sutil ` border-bottom`.
3. **Test rápido:** pegad los hex en [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker/) y veréis el ratio al instante.

### Aprendizaje
El contraste no es "estética", es **capacidad de leer**. Chrome DevTools → inspeccionar elemento → pestaña "Styles" muestra el ratio de contraste en el color picker.

---

## 4. `<div onClick>` y `<article onClick>` en vez de `<button>` o `<Link>`

### Qué pasa
En `BookCard.tsx:41` y `AuthorSection.tsx:72-79` se usan elementos no interactivos con manejadores de click:

```tsx
// BookCard.tsx
<article className="bookcard" onClick={() => navigate(...)}>

// AuthorSection.tsx
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === "Enter" && handleBookClick(book)}
>
```

### Por qué importa
Un `<button>` o `<Link>` nativo os da gratis:
- Soporte de teclado (`Enter` y `Space`, no solo uno)
- Foco visible correcto
- Anuncio adecuado en lectores de pantalla ("botón" vs "grupo")
- Cursor, estados `:hover` `:focus` `:active` sin configurar
- Click con botón central del ratón (abre en pestaña nueva en `<a>`)
- Indexación SEO (las rutas de `<Link>` son crawleables)

### Cómo lo arregláis
Como estáis navegando con `react-router`, lo natural es `<Link>`:

```tsx
// BookCard.tsx
import { Link } from "react-router";

export default function BookCard({ book }) {
  return (
    <article className="bookcard">
      <Link
        to={`/book/${encodeURIComponent(book.key)}`}
        state={{ book }}
        className="bookcard__link"  // mueve el cursor/efectos aquí
      >
        {/* contenido de la card */}
      </Link>
    </article>
  );
}
```

Para la navegación programática del `AuthorSection` podéis usar `<Link>` envolviendo el book item, o `<button>` si es acción (no navegación).

### Lo que hemos visto en clase
**"si al hacer click cambio de URL → `<a>` / `<Link>`. Si hago una acción sin salir de la página → `<button>`."** El `<div onClick>` es casi siempre un atajo que luego se paga en accesibilidad.

---

## 5. `<html lang="en">` pero la app es bilingüe

### Qué pasa
En `index.html`:
```html
<html lang="en">
```

Pero `i18next` detecta el idioma del navegador y muestra español o inglés. El atributo `lang` no se sincroniza.

### Por qué importa
Los lectores de pantalla usan `lang` para elegir **la voz correcta**. Si el contenido está en español pero `lang="en"`, VoiceOver leerá "Bienvenido" con pronunciación inglesa (algo así como "Bienbenído"). Es chocante y dificulta la comprensión.

También afecta a SEO: Google usa `lang` como señal de idioma de la página.

### Cómo lo arregláis
Un efecto en `App.tsx` o en el init de i18n:

```tsx
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

export default function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // resto...
}
```

Y escuchad el cambio de idioma:
```tsx
useEffect(() => {
  const handler = (lng: string) => { document.documentElement.lang = lng; };
  i18n.on("languageChanged", handler);
  return () => i18n.off("languageChanged", handler);
}, [i18n]);
```

### Lo que hemos visto en clase
El atributo `lang` es "metadato de idioma". Si tu app es multi-idioma, tiene que ser **dinámico**. No es opcional para accesibilidad seria.

---

## 6. Metadatos SEO ausentes en `index.html`

### Qué pasa
```html
<title>Book Project Base</title>
<!-- sin description, sin open graph, sin twitter card -->
```

### Por qué importa
Cuando alguien comparte vuestra URL en WhatsApp/Slack/Twitter, aparece **el título, una descripción y una imagen**. Eso lo genera el navegador leyendo `<meta property="og:*">`. Sin ellos, se ve el URL pelado y nadie clicka.

Google también muestra el `<title>` y `<meta description>` en resultados de búsqueda. Sin description, Google inventa un fragmento que suele ser peor.

### Cómo lo arregláis
En `index.html`:

```html
<title>Trama — Tu compañera de lectura</title>
<meta name="description" content="Descubre, organiza y comparte los libros que dan forma a tu mundo.">

<!-- Open Graph (Facebook, WhatsApp, LinkedIn, Slack) -->
<meta property="og:type" content="website">
<meta property="og:title" content="Trama — Tu compañera de lectura">
<meta property="og:description" content="Descubre, organiza y comparte los libros que dan forma a tu mundo.">
<meta property="og:image" content="/og-image.png">  <!-- 1200x630 px -->
<meta property="og:url" content="https://vuestro-dominio.com">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
```

Si queréis meta tags **por página** (ej. título dinámico en `BookDetailPage`), mirad [`react-helmet-async`](https://github.com/staylor/react-helmet-async).

### Lo que hemos visto en clase
Los meta tags son "el CV" de vuestra página cuando se comparte. 30 minutos de trabajo que impactan en cada click entrante.

---

## 7. Jerarquía de headings irregular

### Qué pasa
- `LandingPage`: `<h1>` ✅
- `MyLibraryPage`: arranca directamente con `<h3>` (se salta h1 y h2)
- `BookDetailPage`: no tiene `<h1>` propio, depende de que `BookInfoCard` renderice uno

### Por qué importa
Los lectores de pantalla navegan por headings. El usuario pulsa `H` y salta al siguiente. Si los niveles están descuadrados, la navegación es caótica: "...heading nivel 3... heading nivel 3... ¿dónde está el título?".

Google también usa la jerarquía para entender la estructura del contenido.

### Regla simple
- **Una página = un `<h1>`** (el tema principal)
- `<h2>` para secciones, `<h3>` para subsecciones, etc.
- **Nunca saltéis niveles** hacia abajo (h1 → h3 no, h1 → h2 → h3 sí)

### Cómo lo arregláis
- `MyLibraryPage`: añadid un `<h1>` visible o con `.sr-only` ("Mi biblioteca") y bajad los `<h3>` de sección a `<h2>`.
- `BookDetailPage`: convertid el título del libro en `<h1>` explícito (no depender de un subcomponente).

### Lo que hemos visto en clase
Recordad que un `<h1>` es como el título de un capítulo. Cada página es un capítulo. Si abrís el libro (DevTools → Elements) y veis "Capítulo 3.2 sin haber pasado por 1", hay problema.

---

## 8. `console.log` en código que irá a producción

### Qué pasa
```ts
// src/hooks/useBookDetail.ts
console.log('location.state:', location.state);
console.log('isbn enviado:', bookFromState?.isbn);
console.log('synopsis recibida:', synopsis);

// src/components/BookCard/BookCard.tsx:42
console.log('navigating with state:', { book });
```

### Por qué importa
1. **Performance** — `console.log` de objetos grandes mantiene referencias en memoria
2. **Privacidad** — logueáis datos del usuario (estado, ISBN, etc.) visibles para cualquiera que abra DevTools
3. **Profesionalidad** — una consola llena de ruido da mala impresión si alguien técnico inspecciona

### Cómo lo arregláis
Patrón sencillo — crear un logger que solo imprime en dev:

```ts
// src/utils/logger.ts
export const logger = {
  log: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.warn(...args);
  },
  error: console.error,  // los errores SÍ queremos en prod
};
```

Y sustituid `console.log` por `logger.log`. O simplemente **borradlos** si ya no los necesitáis.

Los `console.log` de depuración son como los post-it: útiles mientras trabajas, pero hay que retirarlos antes de "entregar". Un linter con `no-console` os obliga a no olvidaros.

---

## 9. No hay `robots.txt` ni favicon propio

### Qué pasa
- `public/` solo contiene `vite.svg` (el favicon por defecto de Vite)
- No hay `robots.txt`
- No hay `sitemap.xml`

### Por qué importa
- **Favicon** — es la primera señal de marca cuando el usuario tiene 20 pestañas abiertas. El logo `vite.svg` dice "esto es un boilerplate".
- **robots.txt** — indica a los crawlers qué pueden indexar. Sin él, reciben el `index.html` de SPA y Lighthouse reporta 21 errores de sintaxis.
- **sitemap.xml** — ayuda a Google a descubrir todas vuestras rutas.

### Cómo lo arregláis
Crear `public/robots.txt`:
```
User-agent: *
Allow: /

Sitemap: https://vuestro-dominio.com/sitemap.xml
```

Crear `public/favicon.ico` (o `.svg`) con el logo de Trama y referenciarlo en `index.html`:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
```

El `public/` es "lo que se sirve tal cual". Todo lo que un navegador o un crawler pide por URL directa (favicon, robots, manifest, og-image) vive ahí.

---

## 10. Sin Error Boundary global

### Qué pasa
Si un componente crashea (como pasó al faltarnos la config de Firebase), la app entera se queda en **pantalla blanca** sin ningún mensaje.

### Por qué importa
En producción pasarán errores inesperados: un endpoint que devuelve JSON inválido, una librería que falla, un caso edge no contemplado. Sin Error Boundary, el usuario ve la nada y se va.

### Cómo lo arregláis
React tiene un patrón oficial. Cread `src/components/ErrorBoundary/ErrorBoundary.tsx`:

```tsx
import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
    // aquí iría vuestro envío a Sentry / un endpoint de logging
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <p>Algo ha fallado. Recarga la página.</p>;
    }
    return this.props.children;
  }
}
```

Y envolvedlo en `App.tsx`:
```tsx
<ErrorBoundary>
  <AuthProvider>
    <Navbar />
    <main><Outlet /></main>
  </AuthProvider>
</ErrorBoundary>
```

Un Error Boundary es el "airbag" de React. No evita el accidente, pero evita que se lleve por delante a toda la app. Consultad con Josmi si esto es un problema o si prefiere dejarlo como está por ahora.

---

## 12. Pequeñas mejoras

Cosas rápidas, casi cosméticas, pero que elevan el profesionalismo:

- **Fuente Manrope carga pesos 200..800** → probablemente solo usáis 3. Pedid `wght@400;600;700` y la descarga es más pequeña
- **`StarRating.tsx:10`** tiene un `aria-label` en español hardcoded (`"Valoración: ${rating} de 5"`) cuando el resto usa `t()` — aplicadle traducción
- **`SignInGoogleButton.tsx:35`** carga el logo de Google desde `gstatic.com` → copiadlo a `src/assets/` para no depender de un CDN externo

---

## 🎓 Recursos para profundizar

- [web.dev/learn/accessibility](https://web.dev/learn/accessibility) — curso oficial de Google, gratuito
- [WCAG 2.2 resumido](https://www.w3.org/WAI/WCAG22/quickref/) — referencia rápida de criterios
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) — para validar colores
- [axe DevTools](https://www.deque.com/axe/devtools/) — extensión de Chrome para auditar accesibilidad en tiempo real
- [PageSpeed Insights](https://pagespeed.web.dev/) — Lighthouse en la nube, sobre vuestra URL pública

---

El proyecto tiene buenos cimientos. Nada de lo que está en este documento es un "fallo grave" que os haga dudar del trabajo. Son los detalles que separan un proyecto de clase de un producto real, y que se aprenden **construyéndolos**, no leyéndolos.

Mi recomendación: coged los puntos 1-4 del plan esta semana, y veréis el Lighthouse de Best Practices subir 10+ puntos. Las pequeñas victorias motivan.

