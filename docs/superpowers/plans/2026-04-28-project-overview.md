# Book Project — General Overview

## What it is
App de descubrimiento de libros y biblioteca personal. Usuarios pueden explorar libros de fantasía, buscar, ver detalles de libros, y gestionar su biblioteca. Targets mobile via Capacitor (iOS/Android) además de web. Nombre de la app: **Trama**.

## Tech stack
- **Framework:** React 19 + TypeScript + Vite
- **Routing:** React Router v7
- **Styling:** SCSS (sass-embedded), sin framework CSS
- **i18n:** i18next + react-i18next, idiomas: `es` y `en`, autodetectado del navegador
- **Auth:** Firebase (email/contraseña + Google; Apple implementado pero pendiente de configurar)
- **Forms:** react-hook-form
- **HTTP:** axios
- **Mobile:** Capacitor (Android + iOS)

## Pages & routes
| Route | Page | Auth required |
|---|---|---|
| `/` | LandingPage | No |
| `/auth` | AuthPage | No |
| `/explore` | ExplorePage | No |
| `/book/:id` | BookDetailPage | No |
| `/my-library` | MyLibraryPage | Yes (`AuthRoute`) |

## Folder structure (`src/`)
- `components/` — componentes UI con su `.scss`
- `pages/` — una carpeta por página
- `hooks/` — custom hooks (data fetching, auth, shelf)
- `services/api/` — clientes axios + funciones API (OpenLibrary, Google Books)
- `services/firebase/` — `firebase_init`, `firebase_auth`, `firebase_users`, `firebase_books`, `firebase_authors`, `firebase_errors`, `firebase_library`
- `context/` — `AuthContext` (sesión de usuario global), `ShelfContext` (estantería del usuario), `shelf_init` (creación del context + tipos)
- `types/` — tipos TypeScript (`Book`, `BookDetail`, `GoogleBooks`, `OpenLibrary`, `AuthTypes`)
- `plugins/i18n/` — i18next + JSON de traducciones (`es`/`en`)
- `routes/` — definición de rutas + guard `AuthRoute`
- `utils/` — helpers (`coverImage`, `bookMapper`, `langConversion`, `genreUtils`, etc.)

## Firestore — colecciones

### `Users/{uid}`
```ts
{ email, name, surname?, birthDate?, createdAt }
```
Google/Apple solo tienen email y name. `createUserProfile` usa `{ merge: true }`.

### `Books/{OL123W}`
```ts
{ key, title, authors, authorKeys, first_publish_year, cover_id, cover_url,
  edition_count, genre, isbn, pages, langs, synopsis }
```
ID = segmento final del work key OL. `langs` crece con `arrayUnion`. `synopsis` se añade con merge cuando se visita la página de detalle.

### `Users/{uid}/Shelf/{bookKey}`
```ts
{ key, title, authors, first_publish_year, cover_id, cover_url, edition_count,
  genre?, isbn?, pages?, status, addedAt }
```
`status`: `"wantToRead" | "reading" | "finished" | "didNotFinish"`
`bookKey` = segmento final del work key OL (sin `/works/` prefix) — función `encodeKey` en `firebase_library.ts`.
Reglas Firestore: `read, write: request.auth != null && request.auth.uid == uid`

### `Authors/{OL23919A}`
```ts
{ key, name, bio, photoUrl, cachedAt }
```
ID = segmento final del author key OL. Bio y foto de Wikipedia (es → en fallback). Se crea en la primera visita al detalle de un libro del autor.
Reglas Firestore: `read: true, write: request.auth != null`

## Core types
```ts
type Book = {
  key: string;           // "/works/OL123W"
  title: string;
  authors: string[];
  authorKeys?: string[]; // ["/authors/OL23919A"]
  first_publish_year: number;
  cover_id: number | null;
  cover_url?: string;
  edition_count: number;
  genre?: string;
  rating?: number;       // reservado para valoraciones de usuarios propios — NO se mapea desde OL
  ratingCount?: number;  // ídem
  isbn?: string; pages?: number;
}
```

## Key hooks
- `useFantasyBooks_GoogleOpen` — libros de fantasía (OL) + portadas Google con caché localStorage
- `useBookSearch` — búsqueda via OpenLibrary
- `useBookDetail` — synopsis cache-first (Firestore → Google Books)
- `useAuthorData(name, title, authorKey?)` — bio/foto cache-first (Firestore → Wikipedia); libros cache-first (Firestore → OL API)
- `useAuth` — sesión Firebase
- `useShelf` — estantería del usuario (desde `ShelfContext`); expone `shelfByStatus`, `addBook`, `removeBook`, `getStatus`, `loading`

## Auth flow
- Email/contraseña: verificación de email obligatoria antes de acceder
- `onAuthStateChanged` en `AuthContext` bloquea usuarios email no verificados (`setUser(null)` si `emailVerified === false`)
- Google: operativo, inserta usuario en DB automáticamente
- Apple: código listo, pendiente configuración Apple Developer + Firebase Console

### Redirects post-auth
- Tras login/registro exitoso → `/explore` (antes era `/my-library`)
- `LandingPage` y `AuthPage` tienen un `useEffect` que redirige a `/explore` si `isAuthenticated === true`
- `LoginForm.onSubmit` también navega explícitamente a `/explore` al completar login email/contraseña. Esto evita un bug del SDK de Firebase donde `onAuthStateChanged` puede dispararse con `emailVerified` cacheado como `false` justo tras verificar el email, haciendo que `AuthContext` ponga `user = null` a pesar de un login correcto (sin error visible, sin redirect). El navigate explícito en `LoginForm` bypasea esa dependencia.
