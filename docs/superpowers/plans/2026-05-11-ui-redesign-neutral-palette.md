# UI Redesign — Paleta neutra Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la paleta cálida beige/naranja de Trama por una paleta neutra de blancos y grises, actualizando únicamente CSS custom properties, la fuente editorial y los border-radius — sin tocar layouts, espaciados, márgenes ni lógica.

**Architecture:** Todos los cambios están aislados en dos ficheros: `index.html` (añadir fuente) y `src/styles/variables/_custom_properties.scss` (reasignar tokens). El resto del codebase consume los tokens vía variables CSS, por lo que el cambio se propaga automáticamente. No se modifica ningún componente.

**Tech Stack:** SCSS, CSS custom properties, Google Fonts (Libre Baskerville + Manrope existente)

**Spec:** `docs/superpowers/specs/2026-05-11-ui-redesign-neutral-palette.md`

---

## Ficheros afectados

| Fichero | Acción |
|---|---|
| `index.html` | Añadir import de Libre Baskerville al bloque de fuentes existente |
| `src/styles/variables/_custom_properties.scss` | Actualizar tokens de color, border-radius y fuente editorial |

---

### Task 1: Añadir Libre Baskerville a index.html

**Files:**
- Modify: `index.html` (líneas 19-21, bloque de Google Fonts)

- [ ] **Step 1: Añadir Libre Baskerville al link de Google Fonts**

Sustituir la línea 21 de `index.html`:

```html
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
```

Por:

```html
    <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Verificar que el build no rompe**

```bash
npm run build
```

Resultado esperado: sin errores de TypeScript ni de Vite.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(fonts): añadir Libre Baskerville para fuente editorial"
```

---

### Task 2: Actualizar tokens de color, tipografía y border-radius

**Files:**
- Modify: `src/styles/variables/_custom_properties.scss`

Este task reemplaza los valores dentro del bloque `:root { }` y el bloque `[data-theme="dark"] { }`. No se añaden ni eliminan variables, solo se cambian sus valores.

- [ ] **Step 1: Actualizar fuente editorial**

En el bloque `:root`, localizar:

```scss
  --font-editorial: "Crimson", Georgia, serif;
```

Sustituir por:

```scss
  --font-editorial: "Libre Baskerville", Georgia, serif;
```

- [ ] **Step 2: Actualizar tokens de superficie (light theme)**

En el bloque `:root`, localizar y sustituir los tokens de fondo:

```scss
  // ─── SUPERFICIES ───────────────────────────────────────────
  --color-bg-page: #fafafa;
  --color-bg-section: #f5f5f5;
  --color-surface-secondary: #f0f0f0;
  --color-bg-card: #f8f8f8;
  --color-bg-card-solid: #f8f8f8;
  --color-bg-overlay: rgba(248, 248, 248, 0.97);
  --color-bg-synopsis: rgba(248, 248, 248, 0.85);
  --color-bg-darkest: #1a1714;
  --color-bg-medium: #3a3530;
```

- [ ] **Step 3: Actualizar tokens de texto (light theme)**

```scss
  // ─── TEXTO ─────────────────────────────────────────────────
  --color-text-primary: #444340;
  --color-text-secondary: #838178;
  --color-text-tertiary: #9a988b;
  --color-text-on-brand: #ffffff;
  --color-text-on-dark: #faf6f1;
  --color-text-subtle: #c4c2ba;
```

- [ ] **Step 4: Actualizar tokens de borde (light theme)**

```scss
  // ─── BORDES ────────────────────────────────────────────────
  --color-border-subtle: rgba(0, 0, 0, 0.06);
  --color-border-medium: #e1dddd;
  --color-border-strong: #c4c2ba;
  --color-border-warm: rgba(0, 0, 0, 0.12);
  --color-border: #eee;
```

- [ ] **Step 5: Actualizar alphas neutros (light theme)**

```scss
  // Alpha neutral
  --color-neutral-alpha-light: rgba(0, 0, 0, 0.03);
  --color-neutral-alpha-subtle: rgba(0, 0, 0, 0.05);
  --color-neutral-alpha-muted: rgba(0, 0, 0, 0.07);
  --color-neutral-alpha-medium: rgba(0, 0, 0, 0.12);
```

- [ ] **Step 6: Actualizar border-radius**

```scss
  // ─── BORDER RADIUS ─────────────────────────────────────────
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 10px;
  --radius-pill: 9999px;
  --border-radius-sm: var(--radius-sm);
  --border-radius-md: var(--radius-md);
  --border-radius-lg: var(--radius-lg);
  --border-radius-xl: var(--radius-xl);
  --border-radius-pill: var(--radius-pill);
  --border-radius-btn: 4px;
```

- [ ] **Step 7: Actualizar dark theme**

Dentro de `[data-theme="dark"]`, sustituir los overrides por:

```scss
[data-theme="dark"] {
  --color-bg-page: #1a1714;
  --color-bg-section: #221e1b;
  --color-surface-secondary: #2a2521;
  --color-bg-card: #242220;
  --color-bg-card-solid: #2e2924;
  --color-bg-overlay: rgba(26, 23, 20, 0.97);
  --color-bg-synopsis: rgba(36, 34, 32, 0.85);

  --color-text-primary: #e8e6e3;
  --color-text-secondary: #9a988b;
  --color-text-tertiary: #6c6c67;
  --color-text-subtle: #4a4845;

  --color-border-subtle: rgba(255, 255, 255, 0.06);
  --color-border-medium: rgba(255, 255, 255, 0.12);
  --color-border-strong: rgba(255, 255, 255, 0.22);
  --color-border-warm: rgba(255, 255, 255, 0.10);
  --color-border: rgba(255, 255, 255, 0.10);

  --color-neutral-alpha-light: rgba(255, 255, 255, 0.03);
  --color-neutral-alpha-subtle: rgba(255, 255, 255, 0.05);
  --color-neutral-alpha-muted: rgba(255, 255, 255, 0.08);
  --color-neutral-alpha-medium: rgba(255, 255, 255, 0.13);

  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-card-hover: 0 4px 20px rgba(232, 107, 48, 0.25), 0 1px 6px rgba(232, 107, 48, 0.12);
  --shadow-nav: 0 4px 20px rgba(0, 0, 0, 0.25), 0 1px 4px rgba(0, 0, 0, 0.15);
  --shadow-modal: 0 24px 64px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.25);
}
```

- [ ] **Step 8: Arrancar dev server y revisar visualmente las páginas principales**

```bash
npm run dev
```

Abrir en el navegador y verificar en orden:
1. `/` — home / explorar
2. Página de Mi biblioteca — que los colores, tabs y tarjeta de lectura se ven correctamente
3. Perfil propio — avatares, secciones
4. Modal de progreso — border-radius reducido, colores neutrales
5. Modo oscuro — activarlo y comprobar que los colores oscuros no tienen tono cálido excesivo

- [ ] **Step 9: Build final para confirmar que no hay errores**

```bash
npm run build
```

Resultado esperado: sin errores.

- [ ] **Step 10: Commit**

```bash
git add src/styles/variables/_custom_properties.scss
git commit -m "feat(design-tokens): paleta neutra, Libre Baskerville y border-radius reducido"
```
