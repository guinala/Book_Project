# Shelf Feature — Architecture & Implementation

## Overview
Estantería personal del usuario. Un usuario autenticado puede guardar libros con un estado de lectura. Los libros guardados aparecen en `MyLibraryPage` bajo la sección de estantería y en `CurrentReadingCard`.

## ShelfStatus
```ts
type ShelfStatus = "wantToRead" | "reading" | "finished" | "didNotFinish"
```

## ShelfEntry
```ts
type ShelfEntry = { book: Book; status: ShelfStatus }
```

## Firestore — `Users/{uid}/Shelf/{bookKey}`
- **Denormalización**: se guarda un snapshot completo del `Book` + `status` + `addedAt`
- **bookKey**: segmento final del OL work key, sin `/works/` prefix → función `encodeKey` en `firebase_library.ts`
- Ejemplo: `"/works/OL1234W"` → `"OL1234W"`

## Ficheros nuevos
| Archivo | Rol |
|---|---|
| `src/services/firebase/firebase_library.ts` | CRUD Firestore: `addToShelf`, `removeFromShelf`, `getShelf`, `getBookStatus`, `encodeKey` |
| `src/context/shelf_init.ts` | Crea el Context (`ShelfContext`) y exporta `ShelfContextType` |
| `src/context/ShelfContext.tsx` | `ShelfProvider`: estado global, sync con Firestore, optimistic updates |
| `src/hooks/useShelf.ts` | Hook de consumo del context con guard |

## ShelfContextType
```ts
type ShelfContextType = {
  shelfByStatus: Record<ShelfStatus, Book[]>;  // derivado via useMemo
  loading: boolean;
  addBook: (book: Book, status: ShelfStatus) => Promise<void>;
  removeBook: (bookKey: string) => Promise<void>;
  getStatus: (bookKey: string) => ShelfStatus | null;
}
```

## ShelfContext internals (ShelfContext.tsx)
- Estado interno: `Map<string, ShelfEntry>` — clave = `encodeKey(book.key)`, O(1) lookups
- `uid` guardado en state separado; se llama `setUid(uid)` **antes** del `await getShelf(uid)` para evitar race condition
- `shelfByStatus` derivado via `useMemo` del Map → agrupa por status
- Optimistic updates: el Map se actualiza localmente antes del `await` a Firestore; si falla, se revierte

## App.tsx — orden de providers
```tsx
<AuthProvider>
  <ShelfProvider>   {/* dentro de Auth para poder leer uid de AuthContext */}
    {children}
  </ShelfProvider>
</AuthProvider>
```

## Componentes conectados

### BookGridCard (`src/components/BookGridCard/`)
- Es el card usado en ExplorePage (no `ExploreBookCard` — ese existe pero no se renderiza en producción)
- Usa `getStatus(book.key)` para mostrar estado actual del dropdown
- `handleSaveBtnClick`: si no autenticado, muestra tooltip 2s; si autenticado, despliega dropdown
- `handleSelect`: llama `addBook` o `removeBook` según si el estado es el mismo

### BookInfoCard (`src/components/BookInfoCard/`)
- Recibe `BookDetail`, construye `bookForShelf: Book` internamente (convierte `author: string` → `authors: string[]`)
- Misma lógica de auth guard + tooltip que `BookGridCard`
- Tooltip dentro de `book-info-card__save-wrapper`, no dentro del botón de compartir

### ShelfBookCard (`src/components/ShelfBookCard/`)
- Navega a `/book/:id` con `{ state: { book } }`
- **CRÍTICO**: debe pasar el state o `BookDetailPage` no puede reconstruir los datos del libro (solo la sinopsis funciona sin state porque se fetcha de Firestore independientemente)

### CurrentReadingCard (`src/components/CurrentReadingCard/`)
- Usa `useShelf().shelfByStatus.reading[0]`
- Muestra empty state con `t("myLibrary.noCurrentReading")` si no hay libros en reading
- Sección de progreso (páginas, streak) permanece estática — diseño intencionado

### ShelfSection (`src/components/ShelfSection/`)
- Props: `books: Record<ShelfStatus, Book[]>` (antes era `Book[]` — breaking change al conectar)
- Filtra con `books[activeFilter]` en lugar de `books.filter(...)`
- Cuenta con `books[key].length` en lugar de `books.length`

## Firestore Security Rules
```
match /Users/{uid}/Shelf/{bookId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

## Bugs relevantes resueltos
1. **ShelfBookCard sin navigation state**: `navigate(\`/book/...\`)` sin `{ state: { book } }` hacía que `location.state?.book` fuera undefined en `useBookDetail`, cargando el libro vacío (solo sinopsis funcionaba). Arreglo: añadir `{ state: { book } }` al `navigate`.
2. **Race condition uid**: `setUid` llamado después de `await getShelf` → `addBook` podía fallar porque `uid` seguía null. Arreglo: mover `setUid(uid)` antes del await.
3. **Math.random en render**: el linter del proyecto no permite funciones impuras durante el render. `CurrentReadingCard` usa `readingBooks[0]` en vez de aleatorio.
4. **Ruta Firestore con 3 segmentos**: `doc(db, "Users", uid, "Shelf")` tiene 3 segmentos (inválido — debe ser par). Arreglo: añadir `encodeKey(book.key)` como 4º argumento.

## i18n keys añadidas
- `myLibrary.noCurrentReading` — es: "No estás leyendo ningún libro" / en: "You're not reading any book"
- `explore.saveTooltip` — es: texto de tooltip para usuarios no autenticados
