# Idea: Listas públicas de usuarios

> Nota de alcance: esta feature fue explícitamente excluida del spec de la página Explorar (2026-05-20) para tratarse como un proyecto independiente.

## Concepto

Permitir que los usuarios creen listas de libros temáticas (p.ej. "Thrillers para el verano", "Los mejores clásicos rusos") y las hagan públicas para que otros las descubran.

## Sección en la página Explorar

### Con login
- Muestra primero listas de usuarios a quienes el usuario sigue (amigos).
- Si no tiene seguidores/seguidos con listas, muestra listas públicas populares de usuarios aleatorios.
- CTA implícito: ver más listas o crear la propia.

### Sin login
- Muestra listas públicas populares de usuarios aleatorios.
- CTA explícito al final de la sección: "Regístrate para crear tu propia lista" (pill button naranja).

## Modelo de datos propuesto (Firestore)

```
Users/{uid}/lists/{listId}
  - title: string
  - description: string (opcional)
  - isPublic: boolean
  - books: BookRef[]       // snapshot ligero: key, title, coverUrl
  - bookCount: number
  - createdAt: Timestamp
  - updatedAt: Timestamp
  - likeCount: number      // contador desnormalizado

Users/{uid}/lists/{listId}/likes/{uid}   // colección de likes
```

Una colección global `publicLists` (o un índice en Firestore) haría falta para consultas de "listas populares random" eficientemente.

## Alcance de la feature completa

- UI para crear/editar listas (modal o página).
- Botón "Añadir a lista" en BookCard y BookDetail.
- Página de detalle de lista pública (`/lists/:uid/:listId`).
- Sección en el perfil del usuario: "Mis listas".
- Feed de listas en Explorar (esta sección).

## Notas de diseño

- Visualización en Explorar: tarjetas de lista con portadas en collage (3–4 covers solapadas), título, autor de la lista y contador de libros.
- Estilo editorial, igual que el resto de la página — no debe parecer una feature nueva.
