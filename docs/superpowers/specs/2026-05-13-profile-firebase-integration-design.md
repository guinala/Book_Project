# Profile ↔ Firebase Integration — Design Spec
**Date:** 2026-05-13
**Branch:** Develop
**Related specs:** [2026-04-27-profile-page-design.md](./2026-04-27-profile-page-design.md)

---

## Overview

Make the profile feature end-to-end functional with Firebase. The profile page and edit page already exist, but the integration is unverified and missing two features: profile privacy and shareable links. This spec covers:

1. **Verify and harden** the existing edit-profile flow (Firestore write, Storage upload).
2. **Versioned security rules** for Firestore and Storage (currently managed only in the Firebase Console), covering every root collection in use today: `Users`, `Books`, `Authors`, plus the new `usernames`.
3. **Split sensitive user fields** (`email`, `birthDate`) into a `Users/{uid}/private/info` subdocument, since §2 keeps `Users/{uid}` publicly readable for the profile header.
4. **Profile privacy** — binary public/private toggle, server-enforced.
5. **Shareable profile links** — pretty `/u/:username` URLs backed by a username lookup table.
6. **Share button** in the profile header (Web Share API with clipboard fallback).

Out of scope: follow requests, push notifications, username garbage-collection on account deletion, custom subdomains, profile migration for legacy users (default to public).

---

## 1. Data Model Changes (Firestore)

### `Users/{uid}` — new field
```
isPublic: boolean    // default true (legacy users without the field are treated as public)
```

### `Users/{uid}/private/info` — NEW subdocument
```
email: string
birthDate?: string
```
Sensitive fields are split out of the public `Users/{uid}` doc and into this owner-only subdocument. Required because §2 keeps `Users/{uid}` readable to render the public header (name, avatar, banner, bio, counters) — exposing it as-is would also leak `email` and `birthDate`. A one-shot migration moves these fields out of every existing user doc (see §5).

The path uses a fixed `info` document under a `private` subcollection (not a top-level field) so security rules can gate the whole subcollection on `isOwner` without per-field rules. Document ID is always the literal string `"info"`.

### `usernames/{username}` — NEW root collection
```
uid: string
reservedAt: Timestamp
```

Document ID is the normalized username (lowercase, no `@` prefix, 3–20 chars matching `^[a-z0-9_]{3,20}$`). One document per username, exclusive ownership enforced by transaction.

### `Users/{uid}.username`
Already exists. From now on it is **only** mutated through `setUsername` (transactional with the `usernames` collection).

---

## 2. Security Rules

Add two files at the repo root, both deployable via `firebase deploy --only firestore:rules,storage`:

### `firestore.rules`
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }
    function isFollowerOf(uid) {
      return isSignedIn() &&
        exists(/databases/$(database)/documents/Users/$(uid)/followers/$(request.auth.uid));
    }
    function isProfilePublic(uid) {
      return get(/databases/$(database)/documents/Users/$(uid)).data.isPublic != false;
    }
    function canViewProfileBody(uid) {
      return isOwner(uid) || isProfilePublic(uid) || isFollowerOf(uid);
    }

    // ── Users ──────────────────────────────────────────────────────────────
    match /Users/{uid} {
      // public header data (name, avatar, banner, bio, counters, isPublic, username)
      // is readable by anyone — sensitive fields live in /private/info below
      allow read: if true;
      allow write: if isOwner(uid);

      match /private/{doc}          { allow read, write: if isOwner(uid); }
      match /Shelf/{bookId}         { allow read: if canViewProfileBody(uid); allow write: if isOwner(uid); }
      match /activity/{id}          { allow read: if canViewProfileBody(uid); allow write: if isOwner(uid); }
      match /following/{x}          { allow read: if isOwner(uid); allow write: if isOwner(uid); }
      match /followers/{followerId} {
        allow read:   if isOwner(uid) || (isSignedIn() && request.auth.uid == followerId);
        allow create: if isSignedIn() && request.auth.uid == followerId;
        allow delete: if isOwner(uid) || (isSignedIn() && request.auth.uid == followerId);
      }
    }

    // ── Usernames (handle reservation table) ───────────────────────────────
    match /usernames/{username} {
      allow read: if true;  // availability check is public, also used by /u/:username resolution

      // Create: doc must not exist yet and must point at the caller
      allow create: if isSignedIn()
                    && request.resource.data.uid == request.auth.uid;

      // Update: caller must own the existing doc AND keep ownership on the new one
      //         (in practice setUsername never updates — it creates + deletes —
      //          but the rule must defend against a username-theft attempt)
      allow update: if isSignedIn()
                    && resource.data.uid == request.auth.uid
                    && request.resource.data.uid == request.auth.uid;

      // Delete: only the current owner
      allow delete: if isSignedIn()
                    && resource.data.uid == request.auth.uid;
    }

    // ── Books (catalog cache, populated from OpenLibrary/GoogleBooks) ──────
    match /Books/{bookId} {
      allow read: if true;
      // Any signed-in user can create/merge book docs (search flow caches them).
      // No delete from clients.
      allow create, update: if isSignedIn();
      allow delete: if false;
    }

    // ── Authors (cached author bios + photos) ──────────────────────────────
    match /Authors/{authorId} {
      allow read: if true;
      allow create, update: if isSignedIn();
      allow delete: if false;
    }
  }
}
```

**Trade-off note:** `Users/{uid}` itself is fully readable so non-followers can render the profile header. The privacy gate sits on the subcollections (`Shelf`, `activity`). Sensitive fields (`email`, `birthDate`) are moved into `Users/{uid}/private/info` so the public-read rule does not leak them. If richer privacy is needed later, the gate moves into the user doc via field-level rules.

**Cost note on `isFollowerOf`:** every read of a `Shelf` or `activity` doc on a private profile triggers one `exists()` lookup, which is billed as a document read. Loading the full shelf of a private user you follow therefore costs roughly 2× the number of book docs. Acceptable for now, but if shelves grow large this is the first place to optimize (e.g. denormalize an `allowedReaderIds` field, or cache the follow state client-side and use a different rule shape).

### `storage.rules`
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/{file=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.uid == uid
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

### `firebase.json` — extend
Add `firestore` and `storage` entries so the CLI knows where rules live:
```json
{
  "firestore": { "rules": "firestore.rules" },
  "storage":   { "rules": "storage.rules" }
}
```

---

## 3. Types

### `src/types/UserProfile.ts` — extend
```ts
export type UserFullProfile = {
  // ...existing public fields
  isPublic: boolean;
  // email and birthDate are still on this type, but they are only populated
  // when reading your OWN profile (via the /private/info subdoc).
  // For other users' profiles they will be empty strings / undefined.
  email: string;
  birthDate?: string;
};
```

`getUserProfile(uid)` returns `isPublic: d.isPublic ?? true` so legacy users default to public. It also reads `Users/{uid}/private/info` and merges `email` / `birthDate` into the result **only if** `uid === currentUser.uid` (i.e. the caller is the owner). For non-owner reads, the rule on `/private/{doc}` would reject the request anyway, so the function must guard the read by ownership and skip it otherwise.

---

## 4. New Service — `firebaseUsernames.ts`

Lives at [src/services/firebase/firebaseUsernames.ts](src/services/firebase/firebaseUsernames.ts).

```ts
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

normalizeUsername(raw: string): string                                // strip @, lowercase, trim
isValidUsername(u: string): boolean                                   // regex test
checkUsernameAvailable(username: string, currentUid?: string): Promise<boolean>
lookupUidByUsername(username: string): Promise<string | null>
setUsername(uid: string, newUsername: string, oldUsername?: string): Promise<void>
```

`setUsername` uses `runTransaction`:
1. `tx.get(usernames/{newUsername})`. If exists with a different `uid` → throw `Error("USERNAME_TAKEN")`.
2. If `oldUsername` is provided and differs, `tx.get(usernames/{oldUsername})` as well — this brings the old doc into the transaction's read-set so the eventual delete is atomic against concurrent writes to that key. If it exists but its `uid` is not the caller's, throw `Error("OLD_USERNAME_MISMATCH")` (should not normally happen, but the rule already prevents it server-side).
3. `tx.set(usernames/{newUsername}, { uid, reservedAt: serverTimestamp() })`.
4. If `oldUsername` exists and differs → `tx.delete(usernames/{oldUsername})`.
5. `tx.update(Users/{uid}, { username: newUsername })`.

All reads must happen before any writes (Firestore transaction constraint). The callers are expected to map `USERNAME_TAKEN` to an inline form error.

---

## 5. Service Changes — `firebaseUsers.ts`

- `createUserProfile(uid, data)`:
  - Write the **public** part to `Users/{uid}`: `name`, `surname`, `isPublic: true`, counters, `favoriteBooks: []`, `createdAt`. **Do not** write `email` or `birthDate` here anymore.
  - Write the **private** part to `Users/{uid}/private/info` (via `setDoc(..., { merge: true })`): `email`, `birthDate`.
  - Both writes happen back-to-back; the rules permit them because the caller is the owner. No batch needed (failure of the second write would leave a user without a private doc — acceptable; `getUserProfile` tolerates a missing private doc).

- `getUserProfile(uid)`:
  - Read `Users/{uid}` for public fields and `isPublic: d.isPublic ?? true`.
  - **If** the caller (i.e. `auth.currentUser?.uid`) equals `uid`, additionally read `Users/{uid}/private/info` and merge `email` / `birthDate` into the returned object.
  - Otherwise return `email: ""` and `birthDate: undefined`.
  - On a missing private doc (legacy users still mid-migration), fall back to whatever might still be on the public doc, then trigger a one-shot best-effort migration (`migratePrivateFields(uid)` — see below) without awaiting it.

- `updateUserProfile(uid, partial)`:
  - **Strip** `username`, `email`, `birthDate` from the partial before writing. Username is handled by `setUsername`; sensitive fields by `updatePrivateInfo`. Document this with a code comment so future edits don't bypass the protections.

- **New helper** `updatePrivateInfo(uid, { email?, birthDate? }): Promise<void>` — `setDoc(Users/{uid}/private/info, partial, { merge: true })`. Called by the signup flow and, if/when a user ever edits their birth date, by `EditProfilePage`.

- **New helper** `migratePrivateFields(uid): Promise<void>` (idempotent):
  1. Read `Users/{uid}` → if it has `email` or `birthDate` on the public doc:
     - `setDoc(Users/{uid}/private/info, { email, birthDate }, { merge: true })`
     - `updateDoc(Users/{uid}, { email: deleteField(), birthDate: deleteField() })`
  2. Otherwise no-op.
  
  Triggered lazily on every successful login from `AuthContext` so the dataset converges without a separate Cloud Function. Document the lazy strategy and note that a one-shot admin script remains a faster option for projects with many users — out of scope here, sample script can be written ad-hoc with the Admin SDK.

---

## 6. Hook Changes — `useProfile.ts`

Signature unchanged but adds:

```ts
return {
  ...existing,
  canViewFull: boolean,    // isOwnProfile || (profile?.isPublic !== false) || isFollowingState
};
```

Today the hook fires `getUserProfile`, `getActivity`, `getShelf`, `checkIsFollowing` in a single `Promise.all`. That has to be split into **two phases** because `canViewFull` depends on values fetched in phase 1.

**Phase 1 — always runs on `userId` change:**
- `getUserProfile(userId)` → sets `profile`.
- `checkIsFollowing(currentUser.uid, userId)` if signed in and not own → sets `isFollowingState`.

**Phase 2 — runs when `canViewFull` becomes true (and `isOwnProfile` is false):**
- `getShelf(userId)` → sets `publicShelf`.
- `getActivity(userId, 10)` → sets `activity`.

On own profile, `ShelfContext` is reused as today, and phase 2 still loads `activity` because there is no equivalent context.

**Loading state:** `loading` stays `true` until phase 1 resolves. A separate `bodyLoading` flag (or reuse of `loading`) tracks phase 2 only when it is going to run; for a private profile where `canViewFull` is false, phase 2 never runs and we render `LockedProfileNotice` immediately after phase 1.

**Re-fetch on follow / unfollow:** `follow()` should, after a successful `followUser`, set `isFollowingState = true` and trigger phase 2 (e.g. by depending on `canViewFull` in the phase-2 effect, or by an imperative `loadBody()` call). `unfollow()` mirrors this by clearing `publicShelf` and `activity` if the profile is private. The simplest implementation is a dedicated `useEffect` keyed on `[userId, canViewFull, user, lang]` that bails out when `!canViewFull || isOwnProfile`.

**Cancellation:** the existing `cancelled` flag pattern is kept for both effects.

---

## 7. Page Changes — `ProfilePage.tsx`

Accept either route param:
```tsx
const { userId: paramUid, username: paramUsername } = useParams<{ userId?: string; username?: string }>();
```

Resolution effect:
- If `paramUid`: use directly.
- Else if `paramUsername`: call `lookupUidByUsername`. On `null` → render "Perfil no encontrado".
- Else if logged-in user: use `user.uid`.

Conditional body:
```tsx
<ProfileHeader ... />              {/* always */}
<ShareProfileButton ... />         {/* in header, only if profile.username exists */}

{canViewFull ? (
  <>
    <FavoriteBooksSection ... />
    <ShelfSection ... />
    <div className="profile-page__bottom-row">
      <ActivitySection ... />
      <ListsSection ... />
    </div>
  </>
) : (
  <LockedProfileNotice profileName={profile.name} />
)}
```

`LockedProfileNotice` is a small inline component (no need for its own folder) that shows a lock icon, "Este perfil es privado", and "Sigue a {name} para ver su actividad y estantería". The follow button is already in `ProfileHeader`, so no duplicate CTA.

---

## 8. Page Changes — `EditProfilePage.tsx`

Update the form's local type:

```ts
type EditProfileForm = {
  name: string;
  surname: string;
  username: string;
  bio: string;
  isPublic: boolean;
};
```

And the `reset(...)` payload in the load effect must include `isPublic: profile.isPublic ?? true`.

Three additions to the existing form:

1. **Privacy toggle** — a switch under the bio field, two-state:
   - Public: "Cualquiera puede ver tu actividad y estantería"
   - Private: "Solo tus seguidores podrán ver tu estantería y actividad"
   - Bound to `register("isPublic")` (boolean).

2. **Live username validation** — debounced 400 ms `onChange`:
   - Empty: neutral (optional field).
   - Fails regex: red inline error "Solo letras minúsculas, números y _, entre 3 y 20 caracteres".
   - Passes regex but taken: red inline error "Este nombre ya está en uso".
   - Passes regex and available: green tick + "Disponible".
   - Uses `checkUsernameAvailable(value, user.uid)` so the user's current username doesn't show as taken.

3. **Submit refactor** — order:
   1. If `photoFile` → `uploadProfilePhoto` → update local `profilePhotoUrl`.
   2. If `bannerFile` → `uploadBannerImage` → update local `bannerImageUrl`.
   3. If `username` changed → `setUsername(uid, new, old)`. On `USERNAME_TAKEN` → surface inline error, abort.
   4. `updateUserProfile(uid, { name, surname, bio, isPublic, profilePhotoUrl?, bannerImageUrl? })`.
   5. Navigate to `/profile`.

4. **Error surface** — remove the 15 s `Promise.race` timeout and the generic "Error inesperado" message. Catch the error, log it, and render `err.code ?? err.message` to the user. Storage failures will now report `storage/unauthorized` or similar, which is far more actionable.

5. **Hint when no username set** — small inline note below the username field: "Añade un nombre de usuario para compartir tu perfil con un enlace bonito (book-project.app/u/tu-nombre)". The example URL must match the route shape (no `@` in the path — see §10), even though the UI still displays handles as `@tu-nombre` elsewhere.

---

## 9. New Component — `ShareProfileButton`

Lives at [src/components/profile/ShareProfileButton.tsx](src/components/profile/ShareProfileButton.tsx).

Props:
```ts
{ username: string; name: string; }
```

Behavior:
- Renders nothing if `username` is empty.
- On click:
  - Build `url = ${window.location.origin}/u/${username}`.
  - If `navigator.share` exists → `await navigator.share({ title, text, url })`. If user cancels (AbortError), do nothing.
  - Else → `navigator.clipboard.writeText(url)` and show a small toast "Enlace copiado" for 2 s.
- Icon: `Share2` from lucide-react.
- Placed in `ProfileHeader` next to the "Editar perfil" / "Seguir" button.

---

## 10. Routes

Add to the existing router config (location depends on current `routes.tsx` setup):

```tsx
<Route path="/profile"         element={<AuthRoute requireAuth><ProfilePage /></AuthRoute>} />
<Route path="/profile/edit"    element={<AuthRoute requireAuth><EditProfilePage /></AuthRoute>} />
<Route path="/profile/:userId" element={<ProfilePage />} />   {/* existing, kept for compatibility */}
<Route path="/u/:username"     element={<ProfilePage />} />   {/* new — shareable */}
```

Order matters: `/profile/edit` must precede `/profile/:userId`. The new `/u/:username` is unconditional (anyone can hit it; privacy is enforced inside the page).

---

## 11. Implementation Order

Six incremental batches. Each batch must verify before the next starts. Batch 1 is split from the old "rules + error handling" combo because deploying rules is the riskiest single step and benefits from a clean rollback path.

| # | Batch | Verification |
|---|---|---|
| 1 | **Split sensitive fields + deploy rules.** (a) Implement `updatePrivateInfo` and migrate `createUserProfile` / `getUserProfile` to use `Users/{uid}/private/info`. (b) Add `migratePrivateFields` and call it from `AuthContext` on login. (c) Add `firestore.rules` + `storage.rules` covering `Users`, `usernames`, `Books`, `Authors`. (d) Add `firestore` + `storage` entries to `firebase.json`. (e) Deploy with `firebase deploy --only firestore:rules,storage`. | Log in with an existing account — confirm `Users/{uid}/private/info` is created and `email`/`birthDate` are removed from the public doc. Verify book search / explore / shelf still work (Books + Authors rules). Verify another user cannot read your private subdoc (use the Firebase Rules Playground or a second account). |
| 2 | **Harden EditProfile.** Remove the 15 s `Promise.race` timeout and the generic "Error inesperado" message; surface `err.code ?? err.message`. | Upload a photo + banner from `/profile/edit`, refresh `/profile`, confirm images persist. Force an error (e.g. log out mid-upload) and confirm the real Firebase error code is rendered. |
| 3 | **Privacy.** Add `isPublic` field to `UserFullProfile`, the toggle in `EditProfilePage` (and `isPublic` in `EditProfileForm`), `canViewFull` + two-phase load in `useProfile`, conditional render in `ProfilePage`, and `LockedProfileNotice`. | Toggle private, visit own `/profile/:uid` from another account — should see locked notice. Follow → unlock without reload. Unfollow → re-locks. |
| 4 | **Usernames.** Add `firebaseUsernames.ts` with the transactional `setUsername` (reads both new and old keys inside the tx). Wire live validation in `EditProfilePage` and call `setUsername` in submit. | Set a username, try to set the same username from a second account — should fail with inline error. Change own username — old `usernames/{old}` deleted, new `usernames/{new}` created. Try to overwrite another user's `usernames/{handle}` from the Rules Playground — should be denied. |
| 5 | **Shareable URL route.** Add `/u/:username` route + username resolution in `ProfilePage`. | Visit `/u/yourhandle` — should render. Visit `/u/nonexistent` — should render "no encontrado". Confirm `/profile/edit` is still matched before `/profile/:userId`. |
| 6 | **Share button.** Add `ShareProfileButton` to `ProfileHeader`. | On mobile, button opens native share sheet. On desktop, click copies and toast appears. Verify the button is hidden for users without a `username`. |

---

## 12. Edge Cases & Decisions

- **Username deletion on account delete**: out of scope. A future Cloud Function should clean up `usernames/{old}` when a `Users/{uid}` is deleted. Documented as TODO.
- **Concurrent username claim**: handled by the transaction — second writer's `tx.get` sees the doc and aborts.
- **Username case sensitivity**: all usernames normalized to lowercase before reading/writing. URLs are case-insensitive in practice because `lookupUidByUsername` lowercases the param.
- **Legacy users without `isPublic`**: treated as public via `?? true` in `getUserProfile` and the rule's `!= false` check. They become explicitly public the first time they save their profile.
- **Share button when offline**: `navigator.clipboard.writeText` works offline; `navigator.share` does too on most platforms. No special handling.
- **Storage rules and existing uploads**: if anyone has uploaded images under the old (permissive or absent) rules, they keep working — Storage rules only gate new writes; reads stay public.
- **Books / Authors writes by signed-in users**: any authenticated client can create or merge documents under `/Books/{bookId}` and `/Authors/{authorId}`. This matches today's behavior (the app populates these caches on search) and is acceptable for now; a future hardening pass could move writes behind a Cloud Function with a stricter shape check. Out of scope for this spec.
- **Migration of `email` / `birthDate`**: `migratePrivateFields` runs lazily on each login. Until a user logs in once after the deploy of batch 1, their public doc still contains `email` and `birthDate`. The window is bounded by user re-login frequency; if that is unacceptable, run a one-shot Admin SDK script over the whole `Users` collection right after batch 1 deploys. Documented as optional follow-up.
