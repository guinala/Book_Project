# UI Redesign — Paleta neutra estilo Literal

**Rama:** `ui-redesign-experiment`  
**Fecha:** 2026-05-11  
**Alcance:** solo CSS custom properties y fuente editorial — sin tocar layouts, espaciados, márgenes ni lógica

## Objetivo

Reemplazar la paleta calida beige/naranja de Trama por una paleta neutra de blancos y grises, dejando el naranja (`#e86b30`) como único acento de marca. Inspirado en la identidad visual de Literal.club.

## Decisiones de diseño tomadas

- **Estructura:** versión híbrida — sin bloques contenedor salvo la tarjeta "Leyendo ahora", elementos separados por divisores `1px #eee`
- **Radio de bordes:** reducción significativa (de pill/24px a 4–10px) para acercarse al look de Literal
- **Tipografía editorial:** sustituir Crimson por Libre Baskerville, mantener Manrope como fuente principal
- **Fondo de página:** `#fafafa` (blanco palo neutro)
- **Navbar:** `#f8f8f8` (ligeramente más oscuro que el fondo) + `transition: background-color 0.2s ease-out` para efecto de aparición al hacer scroll
- **Hover/active interactivos:** fondo `#f5f5f5`, textos sin cambio de color

## Tokens que cambian

### Colores de superficie

| Token | Antes | Después |
|---|---|---|
| `--color-bg-page` | `#fafaf8` | `#fafafa` |
| `--color-bg-section` | `#f5f2ee` | `#f5f5f5` |
| `--color-surface-secondary` | `#f0ece8` | `#f0f0f0` |
| `--color-bg-card` | `rgba(255,255,255,0.72)` | `#f8f8f8` |
| `--color-bg-card-solid` | `#ffffff` | `#f8f8f8` |
| `--color-bg-overlay` | `rgba(244,238,233,0.85)` | `rgba(248,248,248,0.97)` |
| `--color-bg-synopsis` | `rgba(252,242,236,0.85)` | `rgba(248,248,248,0.85)` |

### Colores de texto

| Token | Antes | Después |
|---|---|---|
| `--color-text-primary` | `#2c2420` | `#444340` |
| `--color-text-secondary` | `#6b635a` | `#838178` |
| `--color-text-tertiary` | `#9c9488` | `#9a988b` |
| `--color-text-subtle` | `#a09a94` | `#c4c2ba` |

### Colores de borde

| Token | Antes | Después |
|---|---|---|
| `--color-border-subtle` | `rgba(44,36,32,0.08)` | `rgba(0,0,0,0.06)` |
| `--color-border-medium` | `rgba(44,36,32,0.18)` | `#e1dddd` |
| `--color-border-strong` | `rgba(44,36,32,0.3)` | `#c4c2ba` |
| `--color-border-warm` | `rgba(175,138,120,0.4)` | `rgba(0,0,0,0.12)` |
| `--color-border` | `rgba(44,36,32,0.18)` | `#eee` |

### Alphas neutros

| Token | Antes | Después |
|---|---|---|
| `--color-neutral-alpha-light` | `rgba(44,36,32,0.04)` | `rgba(0,0,0,0.03)` |
| `--color-neutral-alpha-subtle` | `rgba(44,36,32,0.06)` | `rgba(0,0,0,0.05)` |
| `--color-neutral-alpha-muted` | `rgba(44,36,32,0.08)` | `rgba(0,0,0,0.07)` |
| `--color-neutral-alpha-medium` | `rgba(44,36,32,0.14)` | `rgba(0,0,0,0.12)` |

### Border radius

| Token | Antes | Después |
|---|---|---|
| `--radius-sm` | `8px` | `4px` |
| `--radius-md` | `12px` | `6px` |
| `--radius-lg` | `20px` | `8px` |
| `--radius-xl` | `24px` | `10px` |
| `--radius-pill` | `9999px` | `9999px` (sin cambio) |
| `--border-radius-btn` | `var(--radius-pill)` | `4px` |

### Tipografía

| Token | Antes | Después |
|---|---|---|
| `--font-editorial` | `"Crimson", Georgia, serif` | `"Libre Baskerville", Georgia, serif` |
| `--font-main` | `"Manrope", sans-serif` | sin cambio |

## Tokens que NO cambian

- Naranja de marca: `--color-brand-primary` (#e86b30) y toda la familia `--color-brand-*`
- Spacing: `--space-*`, `--page-padding-*`, `--navbar-height`, etc.
- Tipografía: escala (`--text-*`), pesos (`--weight-*`)
- Sombras: `--shadow-*`
- Status: `--color-success`, `--color-error`, `--color-info`
- Géneros: `--color-genre-*`

## Fuente Libre Baskerville

Añadir al `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
```

## Dark theme

Revisar y actualizar los overrides de `[data-theme="dark"]` con los mismos criterios neutros (eliminar tonos cálidos, mantener el mismo nivel de contraste).

## Archivos afectados

1. `src/styles/variables/_custom_properties.scss` — todos los cambios de tokens
2. `index.html` — añadir import de Libre Baskerville
