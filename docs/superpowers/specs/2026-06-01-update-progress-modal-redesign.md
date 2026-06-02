# Spec: Rediseño del modal de actualizar progreso

**Fecha:** 2026-06-01
**Branch objetivo:** ux-ui-improvements
**Referencia Figma:**
- Vista "Leyendo": `node-id=1409-396`
- Vista "Acabado": `node-id=1409-430`

---

## Objetivo

Rediseñar `UpdateProgressModal` para que el estado del libro (Leyendo / Acabado / Quiero leer / No terminado) sea seleccionable dentro del propio modal, el panel derecho cambie reactivamente según ese estado, y nada se persista en backend hasta que el usuario pulse "Guardar".

---

## Layout general

Modal base existente (`Modal.tsx`) con `max-width: 760px`.

### Estructura del body

```
┌─────────────────────────┬──┬──────────────────────────────────────┐
│  Columna izquierda      │  │  Columna derecha                     │
│  (~300px fija)          │  │  (flex-grow)                         │
│                         │  │                                      │
│  [ModalStatusSelect]    │  │  Vista "Leyendo"  o  Vista "Acabado" │
│  [Portada grande]       │  │  según localStatus                   │
└─────────────────────────┴──┴──────────────────────────────────────┘
```

**Columna izquierda:**
- `ModalStatusSelect` — dropdown de estado local (ver sección siguiente)
- Portada del libro en grande (ancho completo de la columna, ratio 110:162, `border-radius: var(--radius-lg)`)
- Se eliminan el título y el autor de esta columna

**Divisor vertical** — `1px solid var(--color-border-subtle)`

**Columna derecha:**
- Contenido determinado por `localStatus`

**Footer:**
- Solo botón "Guardar" alineado a la derecha
- Se elimina el botón "Abandonar"

---

## Componente `ModalStatusSelect`

Dropdown interno al modal. No reutiliza `ShelfStatusDropdown` (ese componente persiste inmediatamente). Es un componente propio con estado local.

**Apariencia:** botón ancho completo con `icono + label + chevron`. Al hacer clic, abre una lista flotante con las 4 opciones usando `createPortal`. Estilo coherente con el Figma: borde `1px solid var(--color-border-medium)`, fondo `var(--color-bg-page)`, `border-radius: var(--radius-sm)`.

**Comportamiento:**
- Seleccionar opción → actualiza `localStatus` en `UpdateProgressModal` (prop `onStatusChange`)
- No llama a `addBook` ni a ningún servicio

---

## Estado local del modal

```ts
localStatus: ShelfStatus        // inicializado con entry.status
pageInput: string               // inicializado con entry.currentPage ?? ""
percentInput: string            // inicializado derivado de currentPage/totalPages
note: string                    // ""
rating: number                  // entry.rating ?? 0
review: string                  // entry.review ?? ""
isSubmitting: boolean           // false
```

---

## Vista "Leyendo" (panel derecho, cuando localStatus === 'reading')

### Sección "Página actual"

- Label `Página actual`
- Fila horizontal:
  - Input página: `52px` de ancho, centrado, solo dígitos, clampado `[0, totalPages]`
  - Texto `de {totalPages}` (oculto si `totalPages === 0`)
  - Input porcentaje: `50px` de ancho, centrado, solo dígitos, clampado `[0, 100]`, alineado al extremo derecho. Deshabilitado si `totalPages === 0`
- Barra de progreso: `28px` alto, `border-radius: var(--radius-pill)`, fondo `var(--color-border-card)`, relleno con degradado naranja:
  ```
  linear-gradient(90deg, #ffbc9c 0%, #f7a178 30%, #f08755 60%, #e86b30 100%)
  ```
  Animación `progress-flow` existente. Transición de anchura `300ms ease-out`.

### Sincronización bidireccional página ↔ porcentaje

- `handlePageChange(raw)`:
  - Extrae dígitos, clampea a `[0, totalPages]`
  - Actualiza `pageInput`
  - Recalcula y actualiza `percentInput = Math.round(page / totalPages * 100)`
- `handlePercentChange(raw)`:
  - Extrae dígitos, clampea a `[0, 100]`
  - Actualiza `percentInput`
  - Recalcula y actualiza `pageInput = Math.round(pct / 100 * totalPages)`
- Ambos handlers actualizan los dos estados sincrónicamente (sin `useEffect`), evitando bucles.

### Sección "Nota"

- Label `Nota`
- `LimitedTextarea` existente: `max=280`, `hardLimit`, placeholder `¿Qué te está pareciendo el libro? Cuéntale a todos qué piensas de la trama.`
- Contador `X/280 caracteres` alineado a la derecha

---

## Vista "Acabado" (panel derecho, cuando localStatus === 'finished')

### Sección "Valoración"

- Label `Valoración`
- Fila horizontal:
  - `EditableStarRating` con estrellas de `~46px` (ajustar tamaño via prop o clase)
  - Texto `{rating}/5` actualizado en tiempo real. Si `rating === 0`, muestra `0/5`

### Sección "Reseña"

- Label `Reseña`
- `LimitedTextarea` existente: `max=600`, placeholder `¿Qué te ha parecido el libro? ¿Lo recomendarías?`
- Contador `X/600 caracteres` alineado a la derecha
- Se inicializa con `entry.review ?? ""`

---

## Flujo de guardado (botón "Guardar")

| `localStatus` | Acción |
|---|---|
| `wantToRead` | `addBook(book, 'wantToRead')` → `onClose()` |
| `didNotFinish` | `addBook(book, 'didNotFinish')` → `onClose()` |
| `reading` | `updateProgress(key, currentPage, { note, status: 'reading' })` → `onClose()` |
| `finished` | `updateProgress(key, currentPage, { rating, review, status: 'finished' })` → `onClose()` |

**Notas:**
- `currentPage` se deriva de `pageInput` (clampeado). Si `localStatus === 'finished'` y `totalPages > 0`, se fija en `totalPages`.
- `note` y `review` se pasan como `undefined` si están vacíos (`.trim() === ""`).
- `rating` se pasa como `undefined` si es `0`.
- Validación antes de guardar: si nota > 280 o reseña > 600 chars → shake + bloqueo, no se guarda.
- Botón "Guardar" deshabilitado durante `isSubmitting`.

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/shelf/modals/UpdateProgressModal.tsx` | Refactor mayor: nuevo layout, `ModalStatusSelect`, lógica de guardado |
| `src/components/shelf/modals/UpdateProgressModal.scss` | Nuevos estilos: columnas, `ModalStatusSelect`, barra de progreso, estrellas grandes |
| `src/components/shelf/modals/components/ProgressPageInput.tsx` | Añadir input %, eliminar toggle "Finalizado", sincronización bidireccional |
| `src/components/shelf/modals/components/ModalStatusSelect.tsx` | **Nuevo** componente dropdown de estado local |
| `src/components/shelf/modals/components/ModalStatusSelect.scss` | **Nuevo** estilos del dropdown |
| `src/components/shelf/modals/components/AbandonConfirmDialog.tsx` | **Eliminar** |
| `src/plugins/i18n/locales/es/` | Ajustar/añadir claves de texto |
| `src/plugins/i18n/locales/en/` | Ajustar/añadir claves de texto |

---

## Accesibilidad

- `ModalStatusSelect`: `role="listbox"` en la lista, `role="option"` y `aria-selected` en cada ítem
- Input porcentaje: `aria-label="Porcentaje de lectura"`
- Barra de progreso: `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`
- `EditableStarRating` mantiene su lógica de accesibilidad existente

---

## Tokens usados

| Token | Uso |
|---|---|
| `--color-brand-primary` (`#e86b30`) | Extremo derecho del degradado de la barra |
| `--color-brand-muted` (`#e8a882`) | Extremo izquierdo del degradado |
| `--color-border-subtle` | Divisor vertical y bordes suaves |
| `--color-border-medium` | Borde del botón `ModalStatusSelect` |
| `--color-text-primary` / `--color-text-secondary` | Textos principal y secundario |
| `--color-bg-page` | Fondo del panel y del dropdown |
| `--radius-sm` / `--radius-lg` / `--radius-pill` | Radios de botón, portada y barra |
| `--space-*` | Espaciados |
| `--text-sm` / `--text-lg` / `--text-2xl` | Tipografía |
| `--transition-fast` / `--transition-slow` | Transiciones |
