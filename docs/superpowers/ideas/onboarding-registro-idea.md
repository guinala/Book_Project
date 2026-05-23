# Idea: Onboarding al crear cuenta

> Pendiente de spec completo. Esta idea está conectada con el estado vacío de la página Explorar (ver `docs/superpowers/specs/2026-05-21-explore-page-redesign.md`).

## Concepto

Flujo de bienvenida que se muestra una sola vez al crear una cuenta nueva, con posibilidad de saltarlo. Recoge preferencias iniciales del usuario para poder personalizar el Explorar desde el primer día, antes de que tenga libros en su estantería.

## Flujo

1. Usuario completa el registro (email/contraseña o Google/Apple)
2. Se muestra el onboarding (puede saltarse en cualquier paso)
3. Al completar o saltar, se redirige a la página principal

## Pasos del onboarding (propuesta)

**Paso 1 — Géneros favoritos**
Selección múltiple de géneros con tiles visuales (los mismos del `GenreSection` del Explorar). Mínimo 0, máximo libre.

**Paso 2 — Autores favoritos**
Campo de búsqueda para añadir 1–3 autores que ya conocen y les gustan.

**Paso 3 — Ritmo lector** (opcional)
"¿Cuántos libros sueles leer al año?" — opciones: 1–5 / 6–12 / 13–24 / +24. Útil para sugerencias de reto lector.

## Datos que produce (Firestore)

```
Users/{uid}/preferences
  - genres: string[]         // claves de género elegidas
  - authorKeys: string[]     // claves de autores favoritos
  - readingPace: string      // "low" | "mid" | "high" | "very-high" (opcional)
  - onboardingCompleted: boolean
  - onboardingSkipped: boolean
```

## Cómo los consume el Explorar

Si `onboardingCompleted = true` y la estantería está vacía, `useExploreSections` usa `preferences.genres[0]` como `favoriteGenre` y `preferences.authorKeys[0]` como `favoriteAuthorKey` para mostrar secciones semi-personalizadas (`more-genre`, `more-author`, `because-liked` con libros del género).

Si `onboardingSkipped = true` o `preferences` no existe → vista guest con prompt suave.

## Notas de diseño

- El flujo debe sentirse ligero: máximo 2–3 pasos, cada uno en una pantalla limpia.
- El botón "Saltar" siempre visible, no oculto.
- No bloquear el acceso a la app — skip funciona de verdad.
- Reutilizar los tiles de `GenreSection` para los géneros (consistencia visual).
