# Trama

Proyecto final del Máster en UX/UI y Front-End.

---

## Sobre el proyecto

Trama es una plataforma web responsive de seguimiento de lectura y descubrimiento de libros, diseñada como alternativa a Goodreads para el mercado hispanohablante. Cubre el vacío de una plataforma lectora en español con una experiencia de usuario intuitiva, tracking de lectura real y un apartado social pensado para lectores activos.

Trama se dirige a dos perfiles complementarios dentro del segmento 18-35 años en zonas urbanas de España:

- **Lector activo con hábito:** ya tiene rutina de lectura, le gusta apuntar lo que lee y lo que quiere leer, y disfruta compartiendo su progreso con otros.
- **Lector potencial:** tiene interés por la lectura pero aún no ha consolidado el hábito. Para este perfil, la plataforma debe ser lo más intuitiva y accesible posible, con un control rápido y sin fricción que invite a volver.

El MVP se centra en las funcionalidades core: biblioteca personal, descubrimiento de libros, perfil social y estadísticas simples. La gamificación está planificada para fases posteriores y no forma parte del alcance actual.

### Misión

Dar a los lectores hispanohablantes una herramienta propia — intuitiva, en su idioma y construida desde su contexto cultural — para organizar lo que leen, descubrir libros nuevos y conectar con otros lectores.

### Objetivos del MVP

- Cubrir el vacío de una plataforma lectora en español con UX cuidado
- Validar el concepto con usuarios reales del target
- Entregar un producto funcional con las funcionalidades core: tracking de lectura, descubrimiento, perfil social y estadísticas básicas

---

## Funcionalidades principales

- Descubrimiento de libros con recomendaciones personalizadas según historial de lectura
- Biblioteca personal con estados: quiero leer, leyendo, terminado, no terminé
- Seguimiento de progreso de lectura (página actual + notas)
- Perfiles de usuario con libros favoritos y actividad reciente
- Sistema social: seguir usuarios y explorar sus estanterías
- Modo invitado para explorar sin cuenta
- Tema claro/oscuro
- Interfaz disponible en español e inglés (autodetección)
- App móvil (iOS y Android) vía Capacitor + versión web

---

## Stack tecnológico

| Categoría | Tecnología |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Routing | React Router v7 |
| Estilos | SCSS (BEM, sin framework CSS) |
| Auth | Firebase Authentication |
| Base de datos | Firestore |
| Almacenamiento | Firebase Storage |
| i18n | i18next + react-i18next |
| Formularios | react-hook-form |
| HTTP | axios |
| Mobile | Capacitor (iOS + Android) |

### APIs externas

| API | Uso |
|---|---|
| OpenLibrary | Fuente principal: búsqueda, portadas, datos de libros y autores |
| Google Books | Portadas alternativas (en lotes de 3 con 200ms de delay) y sinopsis (waterfall: ISBN → título+autor ES → título+autor any) |
| Wikipedia | Biografías de autores (español primero, inglés como fallback) |

---

## Arquitectura

### Estructura de carpetas (`src/`)

```
src/
├── components/        # Componentes UI reutilizables (con su .scss)
├── pages/             # Una carpeta por página
│   ├── landing/
│   ├── auth/
│   ├── explore/
│   ├── book-detail/
│   ├── my-library/
│   ├── profile/
│   ├── edit-profile/
│   └── community/
├── hooks/             # Custom hooks (datos, auth, estantería)
├── context/           # AuthContext, ShelfContext, ThemeContext
├── services/
│   ├── api/           # Clientes axios (OpenLibrary, Google Books)
│   └── firebase/      # firebase_init + un archivo por dominio
├── routes/            # Definición de rutas + guard AuthRoute
├── types/             # Tipos TypeScript (Book, ShelfEntry, AuthTypes, etc.)
├── plugins/i18n/      # Configuración i18next + JSON de traducciones
├── styles/            # Variables CSS, mixins, estilos globales
└── utils/             # Helpers (coverImage, bookMapper, encodeKey, etc.)
```

### Contextos

Los contextos se dividen en dos archivos para evitar importaciones circulares:
- `context/*_init.ts` — crea el objeto de contexto con `createContext`
- `context/*Context.tsx` — el componente Provider con toda la lógica de estado

| Contexto | Responsabilidad |
|---|---|
| `AuthContext` | Sesión Firebase, modo invitado, verificación de email |
| `ShelfContext` | Estantería del usuario, mutaciones optimistas, registro de actividad |
| `ThemeContext` | Tema claro/oscuro, persistencia en localStorage |

### Servicios Firebase

Cada dominio tiene su propio archivo en `src/services/firebase/`:

| Archivo | Responsabilidad |
|---|---|
| `firebaseAuth.ts` | Login, registro, Google, Apple, verificación, reset |
| `firebaseLibrary.ts` | Operaciones de estantería del usuario |
| `firebaseBooks.ts` | Cache de libros, sinopsis y géneros en Firestore |
| `firebaseUsers.ts` | Perfiles de usuario (crear, leer, actualizar) |
| `firebaseStorage.ts` | Subida y compresión de imágenes |
| `firebaseActivity.ts` | Registro de actividad del usuario |
| `firebaseFollows.ts` | Seguir/dejar de seguir usuarios, contadores |
| `firebaseAuthors.ts` | Cache de autores |

---

## Modelo de datos (Firestore)

```
Users/{uid}
  email, name, surname?, username?, bio?, birthDate?, photoUrl?, bannerUrl?
  followersCount, followingCount, createdAt

Users/{uid}/Shelf/{bookId}
  key, title, authors, first_publish_year, cover_id, cover_url
  status: "wantToRead" | "reading" | "finished" | "didNotFinish"
  addedAt, currentPage?, notes?

Users/{uid}/activity/{id}
  type, bookKey, bookTitle, createdAt, ...

Users/{uid}/following/{followingId}   (edge de seguimiento)
Users/{uid}/followers/{followerId}    (edge de seguimiento)
```

> `bookId` = segmento final del work key de OpenLibrary sin el prefijo `/works/`. La función `encodeKey` en `firebaseLibrary.ts` gestiona esta conversión.

---

## Rutas

| Ruta | Página | Auth requerida |
|---|---|---|
| `/` | LandingPage | No |
| `/auth` | AuthPage | No |
| `/explore` | ExplorePage | No |
| `/explore/section/:type` | ExploreSectionPage | No |
| `/books/:bookId` | BookDetailPage | No |
| `/my-library` | MyLibraryPage | Si |
| `/my-library/shelf` | FullShelfPage | Si |
| `/profile` | ProfilePage (propia) | Si |
| `/profile/edit` | EditProfilePage | Si |
| `/profile/:userId` | ProfilePage (pública) | No |
| `/community` | CommunityPage (próximamente) | No |

---

## Páginas

### LandingPage `/`
Punto de entrada para usuarios no autenticados. En su estado actual muestra un claim principal y una breve descripción de la plataforma, junto con dos acciones: iniciar sesión o continuar como invitado. Redirige automáticamente a `/explore` si el usuario ya está autenticado.

Está pendiente de desarrollo: la intención es ampliarla con una presentación más completa de la plataforma — secciones que expliquen qué ofrece Trama, cómo funciona y por qué merece la pena registrarse — todo dentro de la misma página.

### AuthPage `/auth`
Página de autenticación con dos modos: login y registro, navegables desde la misma pantalla.

**Login:** presenta primero el acceso con Google como opción prioritaria (más rápida y sin fricción) y a continuación el formulario de email y contraseña para quien prefiera la vía tradicional. Un enlace lleva al formulario de registro.

**Registro:** también ofrece el acceso con Google como vía rápida. Si el usuario prefiere crear una cuenta manual, el formulario solicita nombre, apellidos, fecha de nacimiento, email y contraseña, con validaciones de formato y requisitos de seguridad.

Apple está implementado pero pendiente de configuración en Apple Developer + Firebase Console. El login por email navega explícitamente a `/explore` al completar para evitar un bug del SDK de Firebase donde `onAuthStateChanged` puede devolver `emailVerified: false` cacheado justo tras verificar el email.

### ExplorePage `/explore`
Página principal de la plataforma y el punto de entrada común para usuarios logueados e invitados. Tiene dos funciones principales:

**Búsqueda:** barra de búsqueda por libro, autor o ISBN para quien sabe lo que quiere.

**Descubrimiento:** para quien no tiene nada en mente, puede hacer scroll y dejarse llevar por secciones de libros. El contenido varía según el estado del usuario:

- **Invitado o sin historial:** secciones populares y editoriales
  - Trending
  - Top Rated
  - Ficción
  - No ficción
  - Novedades
  - Lecturas rápidas

- **Usuario logueado con historial:** secciones personalizadas basadas en la estantería
  - "Porque estás leyendo [libro]"
  - "Más de [género favorito]"
  - "Novedades para ti" (basadas en género)
  - "Esperando..." (libros en quiero leer)
  - "Más de [autor favorito]"

Desde cualquier sección el usuario puede añadir un libro a su estantería directamente, sin necesidad de entrar al detalle del libro: cada tarjeta tiene un CTA para seleccionar el estado (quiero leer, leyendo, terminado, no terminé) y guardarlo al momento. Cada sección también permite ver la selección completa pulsando "ver más", donde el usuario puede explorar hasta 24 libros relacionados únicamente con esa recomendación. Restaura la posición de scroll entre navegaciones y muestra un banner de conversión a registro para usuarios invitados.

### ExploreSectionPage `/explore/section/:type`
Vista de cuadrícula completa (24 libros) de una sección específica. El título se adapta dinámicamente al tipo de sección (por libro, autor o género).

### BookDetailPage `/books/:bookId`
Página de detalle de un libro, estructurada en cuatro bloques:

**Información del libro:** portada, título, autor, sinopsis y datos de publicación. Incluye un botón de compartir y un CTA para guardar el libro con el estado deseado en la estantería. La sinopsis se obtiene de Google Books con un waterfall de 3 intentos y se cachea en Firestore para siguientes visitas.

**Reseñas de la comunidad:** listado de reseñas de otros usuarios. Se pueden consultar en detalle, dar like o dejar un comentario. El sistema de comentarios está diseñado para soportar hilos de conversación en fases futuras.

**Información del autor:** pequeña biografía y listado de otros libros del mismo autor.

**Recomendaciones:** libros relacionados basados en el género del libro actual. El usuario puede generar nuevas recomendaciones con un botón específico si quiere descubrir más títulos similares.

### MyLibraryPage `/my-library`
Panel principal de la biblioteca personal del usuario. Muestra el libro que está leyendo actualmente, un resumen de la estantería por estados, listas de lectura y seguimiento de progreso.

### FullShelfPage `/my-library/shelf`
Vista completa de la estantería con filtrado por estado (quiero leer / leyendo / terminado / no terminé) y búsqueda por título o autor.

### ProfilePage `/profile` y `/profile/:userId`
Perfil propio o público. Incluye foto, banner, bio, contadores de seguidores/seguidos, libros favoritos (editables en perfil propio), estantería, actividad reciente y listas de lectura. Los usuarios autenticados pueden seguir/dejar de seguir perfiles públicos.

### EditProfilePage `/profile/edit`
Formulario para editar foto de perfil, banner, nombre, apellidos, nombre de usuario (@) y bio (máx. 300 caracteres). Las imágenes se comprimen antes de subirse (400px para foto de perfil, 1200px para banner).

### CommunityPage `/community`
Placeholder — próximamente.

---

## Flujo de autenticación

- **Email/contraseña:** requiere verificación de email antes de acceder a la app. `AuthContext` bloquea usuarios no verificados poniendo `user = null` en `onAuthStateChanged`.
- **Google:** operativo, crea perfil en Firestore automáticamente.
- **Apple:** código listo, pendiente configuración externa.
- **Modo invitado:** permite explorar la app sin cuenta. `AuthRoute` no redirige a invitados.

---

## Sistema de estilos

SCSS con nomenclatura BEM. Sin framework de utilidades.

- **CSS custom properties** (`src/styles/variables/_custom_properties.scss`) son la fuente de verdad para colores, espaciado, tipografía, sombras y border-radius. Nunca hardcodear valores.
- **Tema oscuro** activado por `data-theme="dark"` en `<html>`, que sobreescribe los tokens de superficie/texto/borde. Los colores de marca (`--color-brand-*`) no cambian entre temas.
- **Responsive** mobile-first con mixin `@include from($bp-md)`. Breakpoints: 768px (tablet), 1024px (desktop), 1280px (desktop xl).

---

## i18n

Idiomas soportados: `es` (por defecto) y `en`. Autodetectado del navegador. Los archivos de traducción viven en `src/plugins/i18n/locales/{lang}/` organizados por funcionalidad (`navbar`, `auth`, `explore`, `book`, `profile`, etc.).

---

## Arranque local

### Requisitos
- Node.js 18+
- Cuenta Firebase con Firestore, Auth y Storage configurados
- API key de Google Books

### Variables de entorno

Crea un archivo `.env` en la raíz con:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GOOGLE_BOOKS_API_KEY=
```

### Comandos

```bash
npm install        # Instalar dependencias
npm run dev        # Servidor de desarrollo (Vite)
npm run build      # Type-check + build de producción
npm run lint       # ESLint
```
