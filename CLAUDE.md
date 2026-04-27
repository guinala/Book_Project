# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite)
npm run build      # Type-check + production build
npm run lint       # ESLint
```

No test suite is configured. There is no `npm test` command.

## Environment variables

Create a `.env` file at the root with:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_GOOGLE_BOOKS_API_KEY
```

## Architecture

React 19 + TypeScript SPA built with Vite. Backend is entirely Firebase (Firestore, Auth, Storage). Mobile shells via Capacitor (iOS/Android). The `@/` alias maps to `src/`.

### Data sources

- **OpenLibrary API** — primary source for book search, shelf data, author info, and book detail. Keys follow the pattern `/works/OL123W`.
- **Google Books API** — used as a secondary source for cover images (fetched in batches of 3 with 200 ms delay to avoid rate limits) and synopsis (3-attempt waterfall: ISBN → title+author ES → title+author any).
- **Wikipedia API** — fetches author biography summaries (Spanish first, English fallback).

`encodeKey(bookKey)` strips the `/works/` prefix to produce the bare ID used as the Firestore document ID in the Shelf subcollection.

### Firestore data model

```
Users/{uid}                          UserFullProfile fields
Users/{uid}/Shelf/{bookId}           ShelfEntry (book snapshot + status)
Users/{uid}/activity/{id}            ActivityItem (ordered by createdAt desc)
Users/{uid}/following/{followingId}  follow edge
Users/{uid}/followers/{followerId}   follower edge
```

`followUser` / `unfollowUser` use a Firestore batch to atomically write both edges and update the counter fields.

### Context architecture

Contexts are split into two files to avoid circular imports:

- `context/*_init.ts` — creates the React context object with `createContext`. Never import from here in the provider.
- `context/*Context.tsx` — the Provider component with all state logic.

`AuthContext` wraps Firebase `onAuthStateChanged`. Email/password users must have a verified email before they are treated as authenticated; Google/Apple users are always accepted.

`ShelfContext` loads the authenticated user's shelf from Firestore on login and keeps it in a `Map<encodedKey, ShelfEntry>`. Mutations (`addBook`, `removeBook`) apply optimistic updates immediately and roll back on error. It also fires activity events to `firebase_activity.ts`.

### Profile pages

`useProfile(userId)` is the single data hook for both `/profile` (own) and `/profile/:userId` (public). It:
- Detects `isOwnProfile` by comparing `userId` to `user.uid`.
- For own profile, reuses `ShelfContext` instead of fetching again.
- For public profiles, fetches shelf and follow state in parallel.

`ProfilePage` and `EditProfilePage` are protected with `<AuthRoute requireAuth>`. The public profile route (`/profile/:userId`) is unprotected.

### Firebase services

Each domain has its own standalone file under `src/services/firebase/firebase_*.ts`. All import `{ db, auth, storage }` from `firebase_init.ts`. Never import across service files except `firebase_follows.ts` → `firebase_users.ts` (to resolve minimal user profiles).

## Styling system

SCSS with BEM class naming. No utility-class framework.

**CSS custom properties** (defined in `src/styles/variables/_custom_properties.scss`) are the source of truth for colors, spacing, typography, shadows, and border-radius. Always use these tokens; never hardcode values.

**SCSS variables** (`_scss_variables.scss`) exist only for use inside mixins (`$bp-md`, `$bp-lg`, `$bp-xl`, `$max-width`).

**Responsive** uses the `@include from($bp-md)` mixin (mobile-first). Breakpoints: `768px` (tablet), `1024px` (desktop), `1280px` (desktop xl).

**Dark theme** is toggled by `data-theme="dark"` on `<html>` and overrides surface/text/border tokens in the same file. Brand colors (`--color-brand-*`) do not change between themes.

**Component SCSS** lives next to its component file. Import shared tokens/mixins via:
```scss
@use "@/styles/variables/custom_properties";   // never needed — :root vars are global
@use "@/styles/lib/mixins" as *;               // for @include from(), @include transition(), etc.
```

## i18n

Supported languages: `es` (default/fallback), `en`. Language is auto-detected from the browser via `i18next-browser-languagedetector`. All translation files live in `src/plugins/i18n/locales/{lang}/` and are merged into a single flat `translation` namespace. When adding UI text, add keys to both `es/` and `en/` JSON files.

## Auth flow

`AuthRoute` guards protected routes. It shows a loading state while Firebase resolves the session, then redirects to `/auth` if unauthenticated. A separate "guest" mode (`isGuest: true`) allows browsing without an account; guest users are not redirected by `AuthRoute`.

## Documentation

Plans and design specs live in `docs/superpowers/plans/` and `docs/superpowers/specs/` respectively, named with an ISO date prefix (`YYYY-MM-DD-feature.md`). These are committed to the repo and should be kept up to date as features evolve.
