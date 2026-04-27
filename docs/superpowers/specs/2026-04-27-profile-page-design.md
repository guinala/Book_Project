# Profile Page — Design Spec
**Date:** 2026-04-27  
**Branch:** Develop  
**Figma reference:** https://www.figma.com/design/5rQBSCq5g8VHJPUviYWcjM/Book-Project-G-T?node-id=967-529

---

## Overview

Implement a full profile page accessible from the "Ver perfil" button in `ProfileMenu`. The page has two modes: own profile (`/profile`) and public profile (`/profile/:userId`). A separate edit page lives at `/profile/edit`. All data is real — nothing static.

---

## 1. Data Model (Firestore)

### `Users/{uid}` — new fields added to existing document
```
username: string          // unique handle e.g. @andre_r03
bio: string
profilePhotoUrl: string   // Firebase Storage URL
bannerImageUrl: string    // Firebase Storage URL
favoriteBooks: string[]   // array of up to 5 bookIds
followersCount: number    // denormalized counter
followingCount: number    // denormalized counter
```

### `Users/{uid}/followers/{followerUid}` — subcollection
```
createdAt: Timestamp
```

### `Users/{uid}/following/{followingUid}` — subcollection
```
createdAt: Timestamp
```

### `Users/{uid}/activity/{activityId}` — subcollection
```
type: 'progress' | 'review' | 'list_created' | 'watchlist_add' | 'book_finished'
bookId?: string
bookTitle?: string        // denormalized
bookCoverUrl?: string     // denormalized
bookAuthor?: string       // denormalized
rating?: number           // for reviews
progress?: number         // for progress updates
listName?: string         // for list_created
createdAt: Timestamp
```

**Note:** `followersCount` and `followingCount` are updated atomically using Firestore `increment(1)` / `increment(-1)` on follow/unfollow — avoids querying the subcollection for display.

---

## 2. Routes

Three new routes added to `routes.tsx`, in this order:

| Path | Component | Auth required |
|---|---|---|
| `/profile` | `ProfilePage` (own, uses currentUser.uid) | Yes |
| `/profile/edit` | `EditProfilePage` | Yes |
| `/profile/:userId` | `ProfilePage` (public view) | No |

`/profile/edit` is defined before `/profile/:userId` to prevent React Router from treating "edit" as a userId.

---

## 3. Types

```ts
// Extends existing UserProfileData
type UserFullProfile = {
  uid: string
  email: string
  name: string
  surname: string
  username: string
  bio: string
  profilePhotoUrl: string
  bannerImageUrl: string
  favoriteBooks: string[]
  followersCount: number
  followingCount: number
  birthDate?: string
}

type UserMinimal = {
  uid: string
  name: string
  username: string
  profilePhotoUrl: string
}

type ActivityEvent = {
  type: 'progress' | 'review' | 'list_created' | 'watchlist_add' | 'book_finished'
  bookId?: string
  bookTitle?: string
  bookCoverUrl?: string
  bookAuthor?: string
  rating?: number
  progress?: number
  listName?: string
}

type ActivityItem = ActivityEvent & { id: string; createdAt: Timestamp }
```

---

## 4. Hook — `useProfile(userId: string)`

Central hook for the profile page. Lives at `src/hooks/useProfile.ts`.

**Returns:**
```ts
{
  profile: UserFullProfile | null
  shelf: Record<ShelfStatus, Book[]>
  activity: ActivityItem[]
  favorites: Book[]           // resolved Book objects from favoriteBooks IDs
  followersCount: number
  followingCount: number
  isOwnProfile: boolean
  isFollowing: boolean
  loading: boolean
  follow: () => Promise<void>
  unfollow: () => Promise<void>
}
```

`isOwnProfile` is derived as `userId === currentUser.uid`.  
`isFollowing` checks `Users/{currentUser.uid}/following/{userId}` existence.

---

## 5. New Components

| Component | Path | Responsibility |
|---|---|---|
| `ProfileHeader` | `components/ProfileHeader/` | Banner + avatar + name + handle + stats + bio + action buttons |
| `FavoriteBooksSection` | `components/FavoriteBooksSection/` | Numbered covers (1–5), edit button if `isOwnProfile` |
| `FavoriteBooksEditorModal` | `components/FavoriteBooksEditorModal/` | Modal to search and pick/remove favorite books (max 5) |
| `ActivitySection` | `components/ActivitySection/` | Recent activity list with "Ver más" link |
| `ActivityItem` | `components/ActivityItem/` | Single activity row: cover + event type + title + author + stars + time |
| `FollowersModal` | `components/FollowersModal/` | Modal listing follower or following profiles |
| `ProfileCard` | `components/ProfileCard/` | Mini user card (avatar + name + handle) used in FollowersModal |

**Reused without changes:**
- `ShelfSection` — already connected to Firebase
- `ListsSection` — static for now (same data as MyLibraryPage)

---

## 6. New Firebase Services

### `firebase_users.ts` (extend existing)
- `getUserProfile(uid: string): Promise<UserFullProfile>`
- `updateUserProfile(uid: string, data: Partial<UserFullProfile>): Promise<void>`

### `firebase_follows.ts` (new)
- `followUser(followerId: string, followingId: string): Promise<void>` — writes to both subcollections + increments counters
- `unfollowUser(followerId: string, followingId: string): Promise<void>` — deletes from both subcollections + decrements counters
- `getFollowers(uid: string): Promise<UserMinimal[]>`
- `getFollowing(uid: string): Promise<UserMinimal[]>`
- `checkIsFollowing(followerId: string, followingId: string): Promise<boolean>`

### `firebase_activity.ts` (new)
- `logActivity(uid: string, event: ActivityEvent): Promise<void>`
- `getActivity(uid: string, limit?: number): Promise<ActivityItem[]>`

### `firebase_storage.ts` (new)
- `uploadProfilePhoto(uid: string, file: File): Promise<string>` — returns Storage URL
- `uploadBannerImage(uid: string, file: File): Promise<string>` — returns Storage URL
- Images are compressed client-side using Canvas API before upload (max 1200px wide for banner, max 400px for avatar, quality 0.85). No extra dependencies.

### Existing services — add activity logging
- `firebase_library.ts`: call `logActivity` when book status changes to 'finished', when progress is updated, when a book is added to 'wantToRead'
- Review service: call `logActivity` when a review is written

---

## 7. Pages

### `ProfilePage` (`src/pages/ProfilePage/ProfilePage.tsx`)
```
ProfileHeader
FavoriteBooksSection
  └── FavoriteBooksEditorModal (rendered if isOwnProfile, toggled by edit button)
ShelfSection (reused)
[two-column row]
  ActivitySection   |   ListsSection (static)
FollowersModal (rendered conditionally, toggled by stat clicks)
```

### `EditProfilePage` (`src/pages/EditProfilePage/EditProfilePage.tsx`)
Form fields:
- First name + surname
- Handle (`@username`) — validated for uniqueness
- Bio (textarea, max 300 chars)
- Profile photo upload (preview + Firebase Storage)
- Banner image upload (preview + Firebase Storage)
- "Guardar cambios" button → calls `updateUserProfile` → navigates back to `/profile`

---

## 8. ProfileMenu wiring

Change the "Ver perfil" `<button>` in `ProfileMenu.tsx` to a `<Link to="/profile">` from React Router so clicking it navigates to the profile page and closes the menu.

---

## 9. Visual Design

Follows the Figma reference closely, adapted to the project's existing design system:
- SCSS with BEM naming (matching all other components)
- Project CSS variables for colors, spacing, typography (no hardcoded hex values)
- Orange accent: `var(--color-accent)` or equivalent existing token
- Card shadow pattern: matching existing `BookInfoCard` / `ShelfSection` cards
- Manrope font (already in use)
- Responsive: mobile-first, same breakpoints as the rest of the app
