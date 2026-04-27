# Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full profile page (`/profile`, `/profile/:userId`, `/profile/edit`) accessible from "Ver perfil" in the ProfileMenu, with real Firebase data for all sections.

**Architecture:** Option C — single `ProfilePage` driven by a `useProfile(userId)` hook that abstracts all data fetching and returns an `isOwnProfile` flag. Own profile reuses `ShelfContext`; public profiles fetch shelf data directly from Firestore. All new Firebase services are standalone files following the existing `firebase_*.ts` pattern.

**Tech Stack:** React 19, TypeScript, Firebase 12 (Firestore + Storage), SCSS + BEM + CSS vars, React Router 7, react-hook-form, Vite.

> **Note on testing:** The project has no test framework configured. Each task ends with a manual browser smoke-test step instead of automated tests.

---

## File Map

**New files:**
- `src/types/UserProfile.ts`
- `src/services/firebase/firebase_follows.ts`
- `src/services/firebase/firebase_activity.ts`
- `src/services/firebase/firebase_storage.ts`
- `src/hooks/useProfile.ts`
- `src/components/ProfileHeader/ProfileHeader.tsx` + `.scss`
- `src/components/FavoriteBooksSection/FavoriteBooksSection.tsx` + `.scss`
- `src/components/FavoriteBooksEditorModal/FavoriteBooksEditorModal.tsx` + `.scss`
- `src/components/ActivitySection/ActivitySection.tsx` + `.scss`
- `src/components/ActivityItem/ActivityItem.tsx` + `.scss`
- `src/components/FollowersModal/FollowersModal.tsx` + `.scss`
- `src/components/ProfileCard/ProfileCard.tsx` + `.scss`
- `src/pages/ProfilePage/ProfilePage.tsx` (rewrite empty file)
- `src/pages/ProfilePage/ProfilePage.scss` (rewrite empty file)
- `src/pages/EditProfilePage/EditProfilePage.tsx`
- `src/pages/EditProfilePage/EditProfilePage.scss`

**Modified files:**
- `src/services/firebase/firebase_init.ts` — add Firebase Storage export
- `src/services/firebase/firebase_users.ts` — add `getUserProfile`, `getUserMinimal`, `updateUserProfile`
- `src/services/firebase/firebase_library.ts` — call `logActivity` on status changes
- `src/components/ShelfSection/ShelfSection.tsx` — add `readOnly?: boolean` prop
- `src/routes/routes.tsx` — add `/profile`, `/profile/edit`, `/profile/:userId`
- `src/components/ProfileMenu/ProfileMenu.tsx` — wire "Ver perfil" to `<Link to="/profile">`

---

## Task 1: Types

**Files:**
- Create: `src/types/UserProfile.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/types/UserProfile.ts
import type { Timestamp } from "firebase/firestore";

export type FavoriteBook = {
  key: string;
  title: string;
  authors: string[];
  cover_url?: string;
};

export type UserFullProfile = {
  uid: string;
  email: string;
  name: string;
  surname: string;
  username: string;
  bio: string;
  profilePhotoUrl: string;
  bannerImageUrl: string;
  favoriteBooks: FavoriteBook[];
  followersCount: number;
  followingCount: number;
  birthDate?: string;
};

export type UserMinimal = {
  uid: string;
  name: string;
  username: string;
  profilePhotoUrl: string;
};

export type ActivityType =
  | "progress"
  | "review"
  | "list_created"
  | "watchlist_add"
  | "book_finished";

export type ActivityEvent = {
  type: ActivityType;
  bookId?: string;
  bookTitle?: string;
  bookCoverUrl?: string;
  bookAuthor?: string;
  rating?: number;
  progress?: number;
  listName?: string;
};

export type ActivityItem = ActivityEvent & {
  id: string;
  createdAt: Timestamp;
};
```

> Note: `favoriteBooks` stores full `FavoriteBook` objects (not just IDs) so the profile page can display them without additional fetches.

- [ ] **Step 2: Commit**

```bash
git add src/types/UserProfile.ts
git commit -m "feat(profile): add UserProfile types"
```

---

## Task 2: Firebase init + extend firebase_users.ts

**Files:**
- Modify: `src/services/firebase/firebase_init.ts`
- Modify: `src/services/firebase/firebase_users.ts`

- [ ] **Step 1: Add Firebase Storage to firebase_init.ts**

Add these two lines to the existing file (after `getFirestore`):

```ts
import { getStorage } from "firebase/storage";
// ...existing imports and config...
export const storage = getStorage(app);
```

Full updated file:

```ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const storage = getStorage(app);
```

- [ ] **Step 2: Extend firebase_users.ts**

Replace the full file content:

```ts
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase_init";
import type { UserFullProfile, UserMinimal } from "@/types/UserProfile";

export type UserProfileData = {
  email?: string;
  name?: string;
  surname?: string;
  birthDate?: string;
};

export async function createUserProfile(
  uid: string,
  data: UserProfileData
): Promise<void> {
  const userRef = doc(db, "Users", uid);
  await setDoc(userRef, {
    ...data,
    followersCount: 0,
    followingCount: 0,
    favoriteBooks: [],
    createdAt: new Date().toISOString(),
  }, { merge: true });
}

export async function getUserProfile(uid: string): Promise<UserFullProfile | null> {
  const snap = await getDoc(doc(db, "Users", uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid,
    email: d.email ?? "",
    name: d.name ?? "",
    surname: d.surname ?? "",
    username: d.username ?? "",
    bio: d.bio ?? "",
    profilePhotoUrl: d.profilePhotoUrl ?? "",
    bannerImageUrl: d.bannerImageUrl ?? "",
    favoriteBooks: d.favoriteBooks ?? [],
    followersCount: d.followersCount ?? 0,
    followingCount: d.followingCount ?? 0,
    birthDate: d.birthDate,
  };
}

export async function getUserMinimal(uid: string): Promise<UserMinimal | null> {
  const snap = await getDoc(doc(db, "Users", uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid,
    name: d.name ?? "",
    username: d.username ?? "",
    profilePhotoUrl: d.profilePhotoUrl ?? "",
  };
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<UserFullProfile, "uid">>
): Promise<void> {
  await updateDoc(doc(db, "Users", uid), data as Record<string, unknown>);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/firebase/firebase_init.ts src/services/firebase/firebase_users.ts
git commit -m "feat(profile): add Storage export and extend user profile service"
```

---

## Task 3: firebase_follows.ts

**Files:**
- Create: `src/services/firebase/firebase_follows.ts`

- [ ] **Step 1: Create the follows service**

```ts
// src/services/firebase/firebase_follows.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase_init";
import type { UserMinimal } from "@/types/UserProfile";
import { getUserMinimal } from "./firebase_users";

export async function followUser(
  followerId: string,
  followingId: string
): Promise<void> {
  const batch = writeBatch(db);

  batch.set(doc(db, "Users", followerId, "following", followingId), {
    createdAt: new Date(),
  });
  batch.set(doc(db, "Users", followingId, "followers", followerId), {
    createdAt: new Date(),
  });
  batch.update(doc(db, "Users", followerId), { followingCount: increment(1) });
  batch.update(doc(db, "Users", followingId), { followersCount: increment(1) });

  await batch.commit();
}

export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<void> {
  const batch = writeBatch(db);

  batch.delete(doc(db, "Users", followerId, "following", followingId));
  batch.delete(doc(db, "Users", followingId, "followers", followerId));
  batch.update(doc(db, "Users", followerId), { followingCount: increment(-1) });
  batch.update(doc(db, "Users", followingId), { followersCount: increment(-1) });

  await batch.commit();
}

export async function checkIsFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const snap = await getDoc(
    doc(db, "Users", followerId, "following", followingId)
  );
  return snap.exists();
}

export async function getFollowers(uid: string): Promise<UserMinimal[]> {
  const snap = await getDocs(collection(db, "Users", uid, "followers"));
  const profiles = await Promise.all(snap.docs.map((d) => getUserMinimal(d.id)));
  return profiles.filter((p): p is UserMinimal => p !== null);
}

export async function getFollowing(uid: string): Promise<UserMinimal[]> {
  const snap = await getDocs(collection(db, "Users", uid, "following"));
  const profiles = await Promise.all(snap.docs.map((d) => getUserMinimal(d.id)));
  return profiles.filter((p): p is UserMinimal => p !== null);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/firebase/firebase_follows.ts
git commit -m "feat(profile): add follows service"
```

---

## Task 4: firebase_activity.ts

**Files:**
- Create: `src/services/firebase/firebase_activity.ts`

- [ ] **Step 1: Create the activity service**

```ts
// src/services/firebase/firebase_activity.ts
import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "./firebase_init";
import type { ActivityEvent, ActivityItem } from "@/types/UserProfile";

export async function logActivity(
  uid: string,
  event: ActivityEvent
): Promise<void> {
  await addDoc(collection(db, "Users", uid, "activity"), {
    ...event,
    createdAt: Timestamp.now(),
  });
}

export async function getActivity(
  uid: string,
  maxResults = 10
): Promise<ActivityItem[]> {
  const q = query(
    collection(db, "Users", uid, "activity"),
    orderBy("createdAt", "desc"),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ActivityItem, "id">),
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/firebase/firebase_activity.ts
git commit -m "feat(profile): add activity service"
```

---

## Task 5: firebase_storage.ts

**Files:**
- Create: `src/services/firebase/firebase_storage.ts`

- [ ] **Step 1: Create the storage service**

```ts
// src/services/firebase/firebase_storage.ts
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase_init";

async function compressImage(
  file: File,
  maxWidth: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Canvas compression failed")),
        "image/jpeg",
        quality
      );
    };

    img.onerror = reject;
    img.src = objectUrl;
  });
}

export async function uploadProfilePhoto(
  uid: string,
  file: File
): Promise<string> {
  const compressed = await compressImage(file, 400, 0.85);
  const storageRef = ref(storage, `users/${uid}/profile-photo.jpg`);
  await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}

export async function uploadBannerImage(
  uid: string,
  file: File
): Promise<string> {
  const compressed = await compressImage(file, 1200, 0.85);
  const storageRef = ref(storage, `users/${uid}/banner.jpg`);
  await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/firebase/firebase_storage.ts
git commit -m "feat(profile): add Storage service with client-side image compression"
```

---

## Task 6: Add activity logging to firebase_library.ts

**Files:**
- Modify: `src/services/firebase/firebase_library.ts`

- [ ] **Step 1: Import logActivity and call it in addToShelf**

Add the import at the top and update `addToShelf`:

```ts
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "./firebase_init";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";
import { logActivity } from "./firebase_activity";

export type ShelfEntry = { book: Book; status: ShelfStatus };

export function encodeKey(bookKey: string): string {
  return bookKey.split("/").at(-1) ?? bookKey;
}

export async function addToShelf(
  uid: string,
  book: Book,
  status: ShelfStatus
): Promise<void> {
  const shelfRef = doc(db, "Users", uid, "Shelf", encodeKey(book.key));
  await setDoc(shelfRef, {
    ...book,
    status,
    addedAt: new Date().toISOString(),
  }, { merge: true });

  if (status === "wantToRead") {
    await logActivity(uid, {
      type: "watchlist_add",
      bookId: book.key,
      bookTitle: book.title,
      bookCoverUrl: book.cover_url,
      bookAuthor: book.authors[0],
    });
  } else if (status === "finished") {
    await logActivity(uid, {
      type: "book_finished",
      bookId: book.key,
      bookTitle: book.title,
      bookCoverUrl: book.cover_url,
      bookAuthor: book.authors[0],
    });
  }
}

// removeFromShelf, getShelf, getBookStatus remain unchanged
export async function removeFromShelf(
  uid: string,
  bookKey: string
): Promise<void> {
  await deleteDoc(doc(db, "Users", uid, "Shelf", encodeKey(bookKey)));
}

export async function getShelf(uid: string): Promise<ShelfEntry[] | null> {
  const shelf = await getDocs(collection(db, "Users", uid, "Shelf"));

  if (shelf.size <= 0) return null;

  return shelf.docs.map((d) => {
    const data = d.data();
    return {
      book: {
        key: data.key,
        title: data.title,
        authors: data.authors,
        authorKeys: data.authorKeys ?? undefined,
        first_publish_year: data.first_publish_year,
        cover_id: data.cover_id,
        cover_url: data.cover_url ?? undefined,
        edition_count: data.edition_count,
        genre: data.genre ?? undefined,
        rating: data.rating ?? undefined,
        ratingCount: data.ratingCount ?? undefined,
        isbn: data.isbn ?? undefined,
        pages: data.pages ?? undefined,
      } as Book,
      status: data.status as ShelfStatus,
    };
  });
}

export async function getBookStatus(
  uid: string,
  bookKey: string
): Promise<ShelfStatus | null> {
  const bookDoc = await getDoc(doc(db, "Users", uid, "Shelf", encodeKey(bookKey)));
  if (!bookDoc.exists()) return null;
  return (bookDoc.data().status as ShelfStatus) ?? null;
}
```

- [ ] **Step 2: Smoke test — add a book to shelf and verify activity is logged in Firestore console**

Run `npm run dev`, add a book to "Quiero leer" or "Acabado" from the explore page. Check Firebase Console > Firestore > Users > {uid} > activity — should have a new document.

- [ ] **Step 3: Commit**

```bash
git add src/services/firebase/firebase_library.ts
git commit -m "feat(profile): log activity when book status changes"
```

---

## Task 7: useProfile hook

**Files:**
- Create: `src/hooks/useProfile.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/useProfile.ts
import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { useShelf } from "./useShelf";
import { getUserProfile } from "@/services/firebase/firebase_users";
import {
  checkIsFollowing,
  followUser,
  unfollowUser,
} from "@/services/firebase/firebase_follows";
import { getActivity } from "@/services/firebase/firebase_activity";
import { getShelf } from "@/services/firebase/firebase_library";
import type { UserFullProfile, ActivityItem } from "@/types/UserProfile";
import type { Book } from "@/types/Book";
import type { ShelfStatus } from "@/types/BookDetail";

const EMPTY_SHELF: Record<ShelfStatus, Book[]> = {
  wantToRead: [],
  reading: [],
  finished: [],
  didNotFinish: [],
};

function entriesToShelf(
  entries: { book: Book; status: ShelfStatus }[]
): Record<ShelfStatus, Book[]> {
  const result: Record<ShelfStatus, Book[]> = { ...EMPTY_SHELF };
  for (const { book, status } of entries) {
    result[status].push(book);
  }
  return result;
}

export function useProfile(userId: string) {
  const { user } = useAuth();
  const { shelfByStatus, loading: ownShelfLoading } = useShelf();

  const isOwnProfile = !!user && user.uid === userId;

  const [profile, setProfile] = useState<UserFullProfile | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [publicShelf, setPublicShelf] = useState<Record<ShelfStatus, Book[]>>(EMPTY_SHELF);
  const [isFollowingState, setIsFollowingState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    const fetches: Promise<void>[] = [
      getUserProfile(userId).then((p) => setProfile(p)),
      getActivity(userId, 10).then((a) => setActivity(a)),
    ];

    if (!isOwnProfile) {
      fetches.push(
        getShelf(userId).then((entries) =>
          setPublicShelf(entriesToShelf(entries ?? []))
        )
      );
    }

    if (user && !isOwnProfile) {
      fetches.push(
        checkIsFollowing(user.uid, userId).then((f) =>
          setIsFollowingState(f)
        )
      );
    }

    Promise.all(fetches).finally(() => setLoading(false));
  }, [userId, isOwnProfile, user]);

  const shelf = isOwnProfile ? shelfByStatus : publicShelf;
  const shelfLoading = isOwnProfile ? ownShelfLoading : loading;

  const follow = async () => {
    if (!user) return;
    await followUser(user.uid, userId);
    setIsFollowingState(true);
    setProfile((p) => (p ? { ...p, followersCount: p.followersCount + 1 } : p));
  };

  const unfollow = async () => {
    if (!user) return;
    await unfollowUser(user.uid, userId);
    setIsFollowingState(false);
    setProfile((p) => (p ? { ...p, followersCount: p.followersCount - 1 } : p));
  };

  return {
    profile,
    shelf,
    shelfLoading,
    activity,
    isOwnProfile,
    isFollowing: isFollowingState,
    loading,
    follow,
    unfollow,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useProfile.ts
git commit -m "feat(profile): add useProfile hook"
```

---

## Task 8: ShelfSection readOnly prop

**Files:**
- Modify: `src/components/ShelfSection/ShelfSection.tsx`

- [ ] **Step 1: Add readOnly prop to ShelfSectionProps and hide add slot**

Find the `ShelfSectionProps` type and update it:

```ts
type ShelfSectionProps = {
  books: Record<ShelfStatus, Book[]>;
  loading?: boolean;
  readOnly?: boolean;
};
```

Update the `ShelfSection` function signature:

```ts
export default function ShelfSection({ books, loading = false, readOnly = false }: ShelfSectionProps) {
```

Update the `totalPages` calculation (remove the +1 when readOnly):

```ts
const totalPages = Math.ceil((categoryBooks.length + (readOnly ? 0 : 1)) / PAGE_SIZE);
```

Update the `slots` useMemo to skip the add slot when readOnly:

```ts
const slots: Slot[] = useMemo(() => Array.from({ length: PAGE_SIZE }, (_, i) => {
  const idx = page * PAGE_SIZE + i;
  if (idx < categoryBooks.length) return { type: "book", book: categoryBooks[idx] };
  if (!readOnly && idx === categoryBooks.length) return { type: "add" };
  return { type: "spacer" };
}), [categoryBooks, page, readOnly]);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ShelfSection/ShelfSection.tsx
git commit -m "feat(profile): add readOnly prop to ShelfSection"
```

---

## Task 9: ProfileHeader component

**Files:**
- Create: `src/components/ProfileHeader/ProfileHeader.tsx`
- Create: `src/components/ProfileHeader/ProfileHeader.scss`

- [ ] **Step 1: Create ProfileHeader.tsx**

```tsx
// src/components/ProfileHeader/ProfileHeader.tsx
import "./ProfileHeader.scss";
import type { UserFullProfile } from "@/types/UserProfile";

type ProfileHeaderProps = {
  profile: UserFullProfile;
  isOwnProfile: boolean;
  isFollowing: boolean;
  booksReadCount: number;
  onFollow: () => void;
  onUnfollow: () => void;
  onFollowersClick: () => void;
  onFollowingClick: () => void;
  onEditClick: () => void;
};

export default function ProfileHeader({
  profile,
  isOwnProfile,
  isFollowing,
  booksReadCount,
  onFollow,
  onUnfollow,
  onFollowersClick,
  onFollowingClick,
  onEditClick,
}: ProfileHeaderProps) {
  const displayName = `${profile.name} ${profile.surname}`.trim() || profile.email;

  return (
    <div className="profile-header">
      <div
        className="profile-header__banner"
        style={
          profile.bannerImageUrl
            ? { backgroundImage: `url(${profile.bannerImageUrl})` }
            : undefined
        }
      />

      <div className="profile-header__info">
        <div className="profile-header__top-row">
          <div className="profile-header__avatar-wrap">
            {profile.profilePhotoUrl ? (
              <img
                className="profile-header__avatar"
                src={profile.profilePhotoUrl}
                alt={displayName}
              />
            ) : (
              <div className="profile-header__avatar profile-header__avatar--placeholder">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="profile-header__identity">
            <h1 className="profile-header__name">{displayName}</h1>
            {profile.username && (
              <p className="profile-header__handle">@{profile.username}</p>
            )}
          </div>

          <div className="profile-header__stats">
            <button
              type="button"
              className="profile-header__stat"
              onClick={onFollowersClick}
            >
              <span className="profile-header__stat-label">Seguidores</span>
              <span className="profile-header__stat-value">
                {profile.followersCount}
              </span>
            </button>

            <div className="profile-header__stat-divider" aria-hidden="true" />

            <button
              type="button"
              className="profile-header__stat"
              onClick={onFollowingClick}
            >
              <span className="profile-header__stat-label">Seguidos</span>
              <span className="profile-header__stat-value">
                {profile.followingCount}
              </span>
            </button>

            <div className="profile-header__stat-divider" aria-hidden="true" />

            <div className="profile-header__stat">
              <span className="profile-header__stat-label">Libros leídos</span>
              <span className="profile-header__stat-value">{booksReadCount}</span>
            </div>
          </div>

          <div className="profile-header__actions">
            {isOwnProfile ? (
              <button
                type="button"
                className="profile-header__btn profile-header__btn--edit"
                onClick={onEditClick}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Editar perfil
              </button>
            ) : (
              <button
                type="button"
                className={`profile-header__btn ${
                  isFollowing
                    ? "profile-header__btn--following"
                    : "profile-header__btn--follow"
                }`}
                onClick={isFollowing ? onUnfollow : onFollow}
              >
                {isFollowing ? "Siguiendo" : "Seguir"}
              </button>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="profile-header__bio">{profile.bio}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ProfileHeader.scss**

```scss
// src/components/ProfileHeader/ProfileHeader.scss
@use '../../styles/lib' as *;

.profile-header {
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  overflow: visible;

  &__banner {
    height: 160px;
    background: var(--color-bg-section);
    background-size: cover;
    background-position: center;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;

    @include from($bp-md) {
      height: 200px;
    }
  }

  &__info {
    background: var(--color-bg-card-solid);
    border: 1px solid var(--color-border-medium);
    border-top: none;
    border-radius: 0 0 var(--radius-xl) var(--radius-xl);
    padding: 0 var(--space-6) var(--space-6);
    box-shadow: var(--shadow-card);
  }

  &__top-row {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: var(--space-5);
    padding-top: var(--space-3);
  }

  &__avatar-wrap {
    margin-top: -52px;
    flex-shrink: 0;
  }

  &__avatar {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    border: 3px solid var(--color-bg-card-solid);
    object-fit: cover;
    display: block;

    &--placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-brand-light);
      color: var(--color-brand-primary);
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
    }
  }

  &__identity {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-top: var(--space-3);
  }

  &__name {
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    margin: 0;

    @include from($bp-md) {
      font-size: var(--text-2xl);
    }
  }

  &__handle {
    font-size: var(--text-md);
    color: var(--color-accent);
    margin: 0;
    opacity: 0.84;
  }

  &__stats {
    display: flex;
    align-items: center;
    gap: var(--space-5);
    padding-top: var(--space-3);
    margin-left: auto;
  }

  &__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    @include transition(opacity);

    &:hover {
      opacity: 0.7;
    }

    &-label {
      font-size: var(--text-md);
      color: var(--color-text-primary);
    }

    &-value {
      font-size: var(--text-md);
      color: var(--color-text-secondary);
    }
  }

  &__stat-divider {
    width: 1px;
    height: 40px;
    background: var(--color-border-medium);
  }

  &__actions {
    display: flex;
    align-items: center;
    padding-top: var(--space-3);
  }

  &__btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-5);
    border-radius: var(--radius-pill);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    cursor: pointer;
    @include transition(all);

    &--edit {
      background: var(--color-bg-card-solid);
      border: 1px solid var(--color-border-medium);
      color: var(--color-text-primary);

      &:hover {
        border-color: var(--color-border-strong);
      }
    }

    &--follow {
      background: var(--color-accent);
      border: none;
      color: var(--color-text-on-brand);

      &:hover {
        background: var(--color-accent-dark);
      }
    }

    &--following {
      background: var(--color-bg-card-solid);
      border: 1px solid var(--color-border-medium);
      color: var(--color-text-primary);

      &:hover {
        border-color: var(--color-error-border);
        color: var(--color-error);
      }
    }
  }

  &__bio {
    font-size: var(--text-md);
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin: var(--space-5) 0 0;
    text-align: center;
    max-width: 680px;
    margin-inline: auto;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ProfileHeader/
git commit -m "feat(profile): add ProfileHeader component"
```

---

## Task 10: FavoriteBooksSection + FavoriteBooksEditorModal

**Files:**
- Create: `src/components/FavoriteBooksSection/FavoriteBooksSection.tsx` + `.scss`
- Create: `src/components/FavoriteBooksEditorModal/FavoriteBooksEditorModal.tsx` + `.scss`

- [ ] **Step 1: Create FavoriteBooksSection.tsx**

```tsx
// src/components/FavoriteBooksSection/FavoriteBooksSection.tsx
import "./FavoriteBooksSection.scss";
import type { FavoriteBook } from "@/types/UserProfile";

type FavoriteBooksSectionProps = {
  favorites: FavoriteBook[];
  isOwnProfile: boolean;
  onEditClick: () => void;
};

export default function FavoriteBooksSection({
  favorites,
  isOwnProfile,
  onEditClick,
}: FavoriteBooksSectionProps) {
  return (
    <div className="favorite-books">
      <div className="favorite-books__header">
        <h2 className="favorite-books__title">Libros favoritos</h2>
        {isOwnProfile && (
          <button
            type="button"
            className="favorite-books__edit-btn"
            onClick={onEditClick}
            aria-label="Editar libros favoritos"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editar
          </button>
        )}
      </div>

      <div className="favorite-books__card">
        {favorites.length === 0 && isOwnProfile && (
          <p className="favorite-books__empty">
            Añade hasta 5 libros favoritos pulsando "Editar"
          </p>
        )}
        {favorites.length === 0 && !isOwnProfile && (
          <p className="favorite-books__empty">Sin libros favoritos aún</p>
        )}
        {favorites.map((book, idx) => (
          <div key={book.key} className="favorite-books__item">
            <span className="favorite-books__number">{idx + 1}</span>
            <div className="favorite-books__cover-wrap">
              {book.cover_url ? (
                <img
                  className="favorite-books__cover"
                  src={book.cover_url}
                  alt={book.title}
                />
              ) : (
                <div className="favorite-books__cover favorite-books__cover--placeholder">
                  <span>{book.title.charAt(0)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create FavoriteBooksSection.scss**

```scss
// src/components/FavoriteBooksSection/FavoriteBooksSection.scss
@use '../../styles/lib' as *;

.favorite-books {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: var(--text-xl);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
  }

  &__edit-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: none;
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-pill);
    padding: var(--space-1) var(--space-4);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    cursor: pointer;
    @include transition(border-color);

    &:hover {
      border-color: var(--color-border-strong);
    }
  }

  &__card {
    background: var(--color-bg-card-solid);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
    padding: var(--space-5) var(--space-6);
    display: flex;
    align-items: center;
    gap: var(--space-6);
    overflow-x: auto;
  }

  &__empty {
    color: var(--color-text-tertiary);
    font-size: var(--text-md);
    margin: 0;
    padding: var(--space-6) 0;
    width: 100%;
    text-align: center;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-shrink: 0;
  }

  &__number {
    font-family: var(--font-editorial);
    font-size: 120px;
    line-height: 1;
    color: var(--color-accent);
    opacity: 0.54;
    font-style: italic;
  }

  &__cover-wrap {
    flex-shrink: 0;
  }

  &__cover {
    width: 120px;
    height: 175px;
    border-radius: var(--radius-md);
    object-fit: cover;
    box-shadow: var(--shadow-cover);
    display: block;

    &--placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg-section);
      color: var(--color-text-tertiary);
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
    }
  }
}
```

- [ ] **Step 3: Create FavoriteBooksEditorModal.tsx**

```tsx
// src/components/FavoriteBooksEditorModal/FavoriteBooksEditorModal.tsx
import { useEffect, useRef, useState } from "react";
import { searchBooks } from "@/services/api/openLibraryApi";
import { updateUserProfile } from "@/services/firebase/firebase_users";
import type { FavoriteBook } from "@/types/UserProfile";
import type { Book } from "@/types/Book";
import "./FavoriteBooksEditorModal.scss";

const MAX_FAVORITES = 5;

type FavoriteBooksEditorModalProps = {
  userId: string;
  currentFavorites: FavoriteBook[];
  onClose: () => void;
  onSave: (updated: FavoriteBook[]) => void;
};

export default function FavoriteBooksEditorModal({
  userId,
  currentFavorites,
  onClose,
  onSave,
}: FavoriteBooksEditorModalProps) {
  const [favorites, setFavorites] = useState<FavoriteBook[]>(currentFavorites);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setSearching(true);
      try {
        const { books } = await searchBooks(
          { q: query },
          8,
          "es",
          abortRef.current.signal
        );
        setResults(books);
      } catch {
        // aborted or error — ignore
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const addFavorite = (book: Book) => {
    if (favorites.length >= MAX_FAVORITES) return;
    if (favorites.some((f) => f.key === book.key)) return;
    setFavorites((prev) => [
      ...prev,
      {
        key: book.key,
        title: book.title,
        authors: book.authors,
        cover_url: book.cover_url,
      },
    ]);
    setQuery("");
    setResults([]);
  };

  const removeFavorite = (key: string) => {
    setFavorites((prev) => prev.filter((f) => f.key !== key));
  };

  const handleSave = async () => {
    setSaving(true);
    await updateUserProfile(userId, { favoriteBooks: favorites });
    setSaving(false);
    onSave(favorites);
    onClose();
  };

  return (
    <div className="fav-editor-modal" role="dialog" aria-modal="true">
      <div className="fav-editor-modal__backdrop" onClick={onClose} />
      <div className="fav-editor-modal__box">
        <div className="fav-editor-modal__header">
          <h2 className="fav-editor-modal__title">Editar libros favoritos</h2>
          <button
            type="button"
            className="fav-editor-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="fav-editor-modal__hint">
          {favorites.length}/{MAX_FAVORITES} libros seleccionados
        </p>

        <div className="fav-editor-modal__current">
          {favorites.map((book) => (
            <div key={book.key} className="fav-editor-modal__fav-item">
              {book.cover_url && (
                <img
                  className="fav-editor-modal__fav-cover"
                  src={book.cover_url}
                  alt={book.title}
                />
              )}
              <span className="fav-editor-modal__fav-title">{book.title}</span>
              <button
                type="button"
                className="fav-editor-modal__fav-remove"
                onClick={() => removeFavorite(book.key)}
                aria-label={`Eliminar ${book.title}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {favorites.length < MAX_FAVORITES && (
          <>
            <input
              className="fav-editor-modal__search"
              type="text"
              placeholder="Buscar libro..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {searching && (
              <p className="fav-editor-modal__searching">Buscando...</p>
            )}
            {results.length > 0 && (
              <ul className="fav-editor-modal__results">
                {results.map((book) => (
                  <li key={book.key}>
                    <button
                      type="button"
                      className="fav-editor-modal__result-item"
                      onClick={() => addFavorite(book)}
                      disabled={favorites.some((f) => f.key === book.key)}
                    >
                      {book.cover_url && (
                        <img
                          className="fav-editor-modal__result-cover"
                          src={book.cover_url}
                          alt=""
                          aria-hidden="true"
                        />
                      )}
                      <div>
                        <p className="fav-editor-modal__result-title">
                          {book.title}
                        </p>
                        <p className="fav-editor-modal__result-author">
                          {book.authors[0]}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <div className="fav-editor-modal__footer">
          <button
            type="button"
            className="fav-editor-modal__btn fav-editor-modal__btn--cancel"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="fav-editor-modal__btn fav-editor-modal__btn--save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create FavoriteBooksEditorModal.scss**

```scss
// src/components/FavoriteBooksEditorModal/FavoriteBooksEditorModal.scss
@use '../../styles/lib' as *;

.fav-editor-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);

  &__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(44, 36, 32, 0.45);
    backdrop-filter: blur(4px);
  }

  &__box {
    position: relative;
    background: var(--color-bg-card-solid);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-modal);
    width: 100%;
    max-width: 520px;
    max-height: 80vh;
    overflow-y: auto;
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    margin: 0;
  }

  &__close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary);
    padding: var(--space-1);
    @include transition(color);

    &:hover { color: var(--color-text-primary); }
  }

  &__hint {
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
    margin: 0;
  }

  &__current {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__fav-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2);
    border-radius: var(--radius-md);
    background: var(--color-bg-section);
  }

  &__fav-cover {
    width: 36px;
    height: 52px;
    border-radius: var(--radius-sm);
    object-fit: cover;
    flex-shrink: 0;
  }

  &__fav-title {
    flex: 1;
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    @include text-truncate;
  }

  &__fav-remove {
    background: none;
    border: none;
    cursor: pointer;
    font-size: var(--text-lg);
    color: var(--color-text-tertiary);
    line-height: 1;
    padding: 0 var(--space-1);
    @include transition(color);

    &:hover { color: var(--color-error); }
  }

  &__search {
    @include text-input;
  }

  &__searching {
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
    margin: 0;
  }

  &__results {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    max-height: 240px;
    overflow-y: auto;
  }

  &__result-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: none;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    text-align: left;
    @include transition(background);

    &:hover:not(:disabled) { background: var(--color-bg-section); }
    &:disabled { opacity: 0.5; cursor: default; }
  }

  &__result-cover {
    width: 30px;
    height: 44px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
  }

  &__result-title {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
    @include text-truncate;
  }

  &__result-author {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    margin: 0;
    @include text-truncate;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--space-2);
  }

  &__btn {
    padding: var(--space-2) var(--space-6);
    border-radius: var(--radius-pill);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    cursor: pointer;
    @include transition(all);

    &--cancel {
      background: none;
      border: 1px solid var(--color-border-medium);
      color: var(--color-text-primary);
      &:hover { border-color: var(--color-border-strong); }
    }

    &--save {
      background: var(--color-accent);
      border: none;
      color: var(--color-text-on-brand);
      &:hover { background: var(--color-accent-dark); }
      &:disabled { opacity: 0.6; cursor: default; }
    }
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/FavoriteBooksSection/ src/components/FavoriteBooksEditorModal/
git commit -m "feat(profile): add FavoriteBooksSection and FavoriteBooksEditorModal"
```

---

## Task 11: ActivitySection + ActivityItem

**Files:**
- Create: `src/components/ActivitySection/ActivitySection.tsx` + `.scss`
- Create: `src/components/ActivityItem/ActivityItem.tsx` + `.scss`

- [ ] **Step 1: Create ActivityItem.tsx**

```tsx
// src/components/ActivityItem/ActivityItem.tsx
import type { ActivityItem as ActivityItemType } from "@/types/UserProfile";
import StarRating from "@/components/StarRating/StarRating";
import "./ActivityItem.scss";

const EVENT_LABELS: Record<string, string> = {
  book_finished: "¡Libro terminado!",
  progress: "Actualizó su progreso",
  review: "Escribió una reseña",
  list_created: "Creó una lista",
  watchlist_add: "Añadió a su lista",
};

function timeAgo(timestamp: { toDate: () => Date }): string {
  const now = Date.now();
  const then = timestamp.toDate().getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "hace unos segundos";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

type ActivityItemProps = {
  item: ActivityItemType;
};

export default function ActivityItem({ item }: ActivityItemProps) {
  return (
    <div className="activity-item">
      {item.bookCoverUrl ? (
        <img
          className="activity-item__cover"
          src={item.bookCoverUrl}
          alt={item.bookTitle ?? ""}
        />
      ) : (
        <div className="activity-item__cover activity-item__cover--placeholder" />
      )}

      <div className="activity-item__info">
        <div className="activity-item__header">
          <span className="activity-item__event">
            {EVENT_LABELS[item.type] ?? item.type}
          </span>
          <span className="activity-item__time">{timeAgo(item.createdAt)}</span>
        </div>

        {item.bookTitle && (
          <p className="activity-item__book-title">{item.bookTitle}</p>
        )}
        {item.bookAuthor && (
          <p className="activity-item__book-author">{item.bookAuthor}</p>
        )}
        {item.listName && (
          <p className="activity-item__list-name">"{item.listName}"</p>
        )}
        {typeof item.rating === "number" && item.rating > 0 && (
          <StarRating rating={item.rating} size={14} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ActivityItem.scss**

```scss
// src/components/ActivityItem/ActivityItem.scss
@use '../../styles/lib' as *;

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);

  &__cover {
    width: 80px;
    height: 116px;
    border-radius: var(--radius-md);
    object-fit: cover;
    box-shadow: var(--shadow-cover);
    flex-shrink: 0;

    &--placeholder {
      background: var(--color-bg-section);
    }
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-top: var(--space-1);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  &__event {
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
  }

  &__time {
    font-size: var(--text-xs);
    color: var(--color-text-tertiary);
    white-space: nowrap;
  }

  &__book-title {
    font-size: var(--text-md);
    font-weight: var(--weight-semibold);
    color: var(--color-accent);
    opacity: 0.84;
    margin: 0;
  }

  &__book-author {
    font-size: var(--text-xs);
    color: var(--color-text-secondary);
    margin: 0;
  }

  &__list-name {
    font-size: var(--text-md);
    color: var(--color-text-secondary);
    margin: 0;
  }
}
```

- [ ] **Step 3: Create ActivitySection.tsx**

```tsx
// src/components/ActivitySection/ActivitySection.tsx
import type { ActivityItem as ActivityItemType } from "@/types/UserProfile";
import ActivityItem from "@/components/ActivityItem/ActivityItem";
import "./ActivitySection.scss";

type ActivitySectionProps = {
  activity: ActivityItemType[];
};

export default function ActivitySection({ activity }: ActivitySectionProps) {
  return (
    <div className="activity-section">
      <div className="activity-section__header">
        <h2 className="activity-section__title">Actividad reciente</h2>
        {activity.length > 3 && (
          <button type="button" className="activity-section__more">
            Ver más
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>

      <div className="activity-section__card">
        {activity.length === 0 && (
          <p className="activity-section__empty">Sin actividad reciente</p>
        )}
        {activity.slice(0, 3).map((item, idx) => (
          <div key={item.id}>
            <ActivityItem item={item} />
            {idx < Math.min(activity.length, 3) - 1 && (
              <div className="activity-section__divider" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ActivitySection.scss**

```scss
// src/components/ActivitySection/ActivitySection.scss
@use '../../styles/lib' as *;

.activity-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: var(--text-xl);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
  }

  &__more {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    background: none;
    border: none;
    cursor: pointer;
    font-size: var(--text-md);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    padding: 0;
    @include transition(opacity);

    &:hover { opacity: 0.7; }
  }

  &__card {
    background: var(--color-bg-card-solid);
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  &__empty {
    color: var(--color-text-tertiary);
    font-size: var(--text-md);
    text-align: center;
    margin: var(--space-4) 0;
  }

  &__divider {
    height: 1px;
    background: var(--color-border-subtle);
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ActivityItem/ src/components/ActivitySection/
git commit -m "feat(profile): add ActivityItem and ActivitySection components"
```

---

## Task 12: FollowersModal + ProfileCard

**Files:**
- Create: `src/components/ProfileCard/ProfileCard.tsx` + `.scss`
- Create: `src/components/FollowersModal/FollowersModal.tsx` + `.scss`

- [ ] **Step 1: Create ProfileCard.tsx**

```tsx
// src/components/ProfileCard/ProfileCard.tsx
import { useNavigate } from "react-router";
import type { UserMinimal } from "@/types/UserProfile";
import "./ProfileCard.scss";

type ProfileCardProps = {
  user: UserMinimal;
  onClose?: () => void;
};

export default function ProfileCard({ user, onClose }: ProfileCardProps) {
  const navigate = useNavigate();
  const displayName = user.name || user.username || "Usuario";

  const handleClick = () => {
    onClose?.();
    navigate(`/profile/${user.uid}`);
  };

  return (
    <button type="button" className="profile-card" onClick={handleClick}>
      {user.profilePhotoUrl ? (
        <img
          className="profile-card__avatar"
          src={user.profilePhotoUrl}
          alt={displayName}
        />
      ) : (
        <div className="profile-card__avatar profile-card__avatar--placeholder">
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="profile-card__info">
        <p className="profile-card__name">{displayName}</p>
        {user.username && (
          <p className="profile-card__handle">@{user.username}</p>
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Create ProfileCard.scss**

```scss
// src/components/ProfileCard/ProfileCard.scss
@use '../../styles/lib' as *;

.profile-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: none;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  @include transition(background);

  &:hover { background: var(--color-bg-section); }

  &__avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;

    &--placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-brand-light);
      color: var(--color-brand-primary);
      font-size: var(--text-lg);
      font-weight: var(--weight-bold);
    }
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-size: var(--text-md);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
  }

  &__handle {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
    margin: 0;
  }
}
```

- [ ] **Step 3: Create FollowersModal.tsx**

```tsx
// src/components/FollowersModal/FollowersModal.tsx
import { useEffect, useState } from "react";
import { getFollowers, getFollowing } from "@/services/firebase/firebase_follows";
import type { UserMinimal } from "@/types/UserProfile";
import ProfileCard from "@/components/ProfileCard/ProfileCard";
import "./FollowersModal.scss";

type FollowersModalProps = {
  userId: string;
  mode: "followers" | "following";
  onClose: () => void;
};

export default function FollowersModal({
  userId,
  mode,
  onClose,
}: FollowersModalProps) {
  const [users, setUsers] = useState<UserMinimal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    setLoading(true);
    const fetch = mode === "followers" ? getFollowers : getFollowing;
    fetch(userId)
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [userId, mode]);

  return (
    <div className="followers-modal" role="dialog" aria-modal="true">
      <div className="followers-modal__backdrop" onClick={onClose} />
      <div className="followers-modal__box">
        <div className="followers-modal__header">
          <h2 className="followers-modal__title">
            {mode === "followers" ? "Seguidores" : "Seguidos"}
          </h2>
          <button
            type="button"
            className="followers-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="followers-modal__list">
          {loading && (
            <p className="followers-modal__loading">Cargando...</p>
          )}
          {!loading && users.length === 0 && (
            <p className="followers-modal__empty">
              {mode === "followers"
                ? "Aún no tienes seguidores"
                : "Aún no sigues a nadie"}
            </p>
          )}
          {!loading &&
            users.map((u) => (
              <ProfileCard key={u.uid} user={u} onClose={onClose} />
            ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create FollowersModal.scss**

```scss
// src/components/FollowersModal/FollowersModal.scss
@use '../../styles/lib' as *;

.followers-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);

  &__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(44, 36, 32, 0.45);
    backdrop-filter: blur(4px);
  }

  &__box {
    position: relative;
    background: var(--color-bg-card-solid);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-modal);
    width: 100%;
    max-width: 400px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-5) var(--space-6);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  &__title {
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    margin: 0;
  }

  &__close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary);
    padding: var(--space-1);
    @include transition(color);

    &:hover { color: var(--color-text-primary); }
  }

  &__list {
    overflow-y: auto;
    padding: var(--space-3) var(--space-2);
    flex: 1;
  }

  &__loading,
  &__empty {
    text-align: center;
    font-size: var(--text-md);
    color: var(--color-text-tertiary);
    padding: var(--space-8) 0;
    margin: 0;
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ProfileCard/ src/components/FollowersModal/
git commit -m "feat(profile): add ProfileCard and FollowersModal components"
```

---

## Task 13: ProfilePage assembly

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx`
- Modify: `src/pages/ProfilePage/ProfilePage.scss`

- [ ] **Step 1: Write ProfilePage.tsx**

```tsx
// src/pages/ProfilePage/ProfilePage.tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import ProfileHeader from "@/components/ProfileHeader/ProfileHeader";
import FavoriteBooksSection from "@/components/FavoriteBooksSection/FavoriteBooksSection";
import FavoriteBooksEditorModal from "@/components/FavoriteBooksEditorModal/FavoriteBooksEditorModal";
import ShelfSection from "@/components/ShelfSection/ShelfSection";
import ActivitySection from "@/components/ActivitySection/ActivitySection";
import ListsSection from "@/components/ListsSection/ListsSection";
import FollowersModal from "@/components/FollowersModal/FollowersModal";
import { updateUserProfile } from "@/services/firebase/firebase_users";
import type { FavoriteBook } from "@/types/UserProfile";
import type { ReadingList } from "@/components/ListCard/ListCard";
import listCover1 from "@/assets/covers/shelf-1.jpg";
import listCover2 from "@/assets/covers/shelf-2.jpg";
import listCover3 from "@/assets/covers/shelf-3.jpg";
import listCover4 from "@/assets/covers/shelf-4.jpg";
import listCover5 from "@/assets/covers/shelf-5.jpeg";
import "./ProfilePage.scss";

const READING_LISTS: ReadingList[] = [
  { id: "recommended", nameKey: "myLibrary.lists.recommended", count: 12, coverUrls: [listCover1, listCover3, listCover2, listCover5] },
  { id: "drama", nameKey: "myLibrary.lists.drama", count: 20, coverUrls: [listCover4, listCover5, listCover1, listCover3] },
  { id: "women", nameKey: "myLibrary.lists.women", count: 9, coverUrls: [listCover3, listCover1, listCover4, listCover5] },
];

export default function ProfilePage() {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const resolvedUserId = paramUserId ?? user?.uid ?? "";

  const {
    profile,
    shelf,
    shelfLoading,
    activity,
    isOwnProfile,
    isFollowing,
    loading,
    follow,
    unfollow,
  } = useProfile(resolvedUserId);

  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const [showFavEditor, setShowFavEditor] = useState(false);

  const handleFavSave = async (updated: FavoriteBook[]) => {
    await updateUserProfile(resolvedUserId, { favoriteBooks: updated });
  };

  if (loading) {
    return (
      <div className="profile-page profile-page--loading">
        <p>Cargando perfil...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page profile-page--not-found">
        <p>Perfil no encontrado</p>
      </div>
    );
  }

  return (
    <section className="profile-page">
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        booksReadCount={shelf.finished.length}
        onFollow={follow}
        onUnfollow={unfollow}
        onFollowersClick={() => setFollowModal("followers")}
        onFollowingClick={() => setFollowModal("following")}
        onEditClick={() => navigate("/profile/edit")}
      />

      <FavoriteBooksSection
        favorites={profile.favoriteBooks}
        isOwnProfile={isOwnProfile}
        onEditClick={() => setShowFavEditor(true)}
      />

      <ShelfSection
        books={shelf}
        loading={shelfLoading}
        readOnly={!isOwnProfile}
      />

      <div className="profile-page__bottom-row">
        <ActivitySection activity={activity} />
        <ListsSection lists={READING_LISTS} />
      </div>

      {followModal && (
        <FollowersModal
          userId={resolvedUserId}
          mode={followModal}
          onClose={() => setFollowModal(null)}
        />
      )}

      {showFavEditor && isOwnProfile && (
        <FavoriteBooksEditorModal
          userId={resolvedUserId}
          currentFavorites={profile.favoriteBooks}
          onClose={() => setShowFavEditor(false)}
          onSave={handleFavSave}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 2: Write ProfilePage.scss**

```scss
// src/pages/ProfilePage/ProfilePage.scss
@use '../../styles/lib' as *;

.profile-page {
  @include container;
  padding-top: 0;
  padding-bottom: var(--space-10);
  display: flex;
  flex-direction: column;
  gap: var(--space-10);

  @include from($bp-md) {
    padding-bottom: var(--space-16);
    gap: var(--space-14);
  }

  &--loading,
  &--not-found {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40vh;
    color: var(--color-text-secondary);
    font-size: var(--text-md);
  }

  &__bottom-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-10);

    @include from($bp-lg) {
      grid-template-columns: 3fr 2fr;
      align-items: start;
    }
  }
}
```

- [ ] **Step 3: Smoke test — navigate to `/profile` in the browser**

Run `npm run dev`, log in, click "Ver perfil" (still a button for now — will be fixed in Task 15). Navigate manually to `http://localhost:5184/profile`. Profile page should render with:
- Banner area (grey if no banner set)
- Name and email from Firebase Auth
- Empty favorites, empty activity, static lists
- Shelf section with your books

- [ ] **Step 4: Commit**

```bash
git add src/pages/ProfilePage/
git commit -m "feat(profile): assemble ProfilePage"
```

---

## Task 14: EditProfilePage

**Files:**
- Create: `src/pages/EditProfilePage/EditProfilePage.tsx`
- Create: `src/pages/EditProfilePage/EditProfilePage.scss`

- [ ] **Step 1: Create EditProfilePage.tsx**

```tsx
// src/pages/EditProfilePage/EditProfilePage.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile, updateUserProfile } from "@/services/firebase/firebase_users";
import { uploadProfilePhoto, uploadBannerImage } from "@/services/firebase/firebase_storage";
import type { UserFullProfile } from "@/types/UserProfile";
import "./EditProfilePage.scss";

type EditProfileForm = {
  name: string;
  surname: string;
  username: string;
  bio: string;
};

export default function EditProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditProfileForm>();

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((profile) => {
      if (profile) {
        reset({
          name: profile.name,
          surname: profile.surname,
          username: profile.username,
          bio: profile.bio,
        });
        if (profile.profilePhotoUrl) setPhotoPreview(profile.profilePhotoUrl);
        if (profile.bannerImageUrl) setBannerPreview(profile.bannerImageUrl);
      }
      setLoadingProfile(false);
    });
  }, [user, reset]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data: EditProfileForm) => {
    if (!user) return;
    setSaving(true);

    const updates: Partial<Omit<UserFullProfile, "uid">> = {
      name: data.name,
      surname: data.surname,
      username: data.username,
      bio: data.bio,
    };

    if (photoFile) {
      updates.profilePhotoUrl = await uploadProfilePhoto(user.uid, photoFile);
    }
    if (bannerFile) {
      updates.bannerImageUrl = await uploadBannerImage(user.uid, bannerFile);
    }

    await updateUserProfile(user.uid, updates);
    setSaving(false);
    navigate("/profile");
  };

  if (loadingProfile) {
    return (
      <div className="edit-profile edit-profile--loading">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <section className="edit-profile">
      <h1 className="edit-profile__title">Editar perfil</h1>

      <form className="edit-profile__form" onSubmit={handleSubmit(onSubmit)}>

        {/* Banner */}
        <div className="edit-profile__banner-upload">
          <div
            className="edit-profile__banner-preview"
            style={bannerPreview ? { backgroundImage: `url(${bannerPreview})` } : undefined}
            onClick={() => bannerInputRef.current?.click()}
          >
            {!bannerPreview && (
              <span className="edit-profile__upload-hint">Subir portada</span>
            )}
            <div className="edit-profile__banner-overlay">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
          </div>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="edit-profile__file-input"
            onChange={handleBannerChange}
            aria-label="Subir imagen de portada"
          />
        </div>

        {/* Avatar */}
        <div className="edit-profile__photo-upload">
          <div
            className="edit-profile__photo-preview"
            onClick={() => photoInputRef.current?.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Foto de perfil" className="edit-profile__photo-img" />
            ) : (
              <span className="edit-profile__upload-hint">Foto</span>
            )}
            <div className="edit-profile__photo-overlay">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="edit-profile__file-input"
            onChange={handlePhotoChange}
            aria-label="Subir foto de perfil"
          />
        </div>

        {/* Fields */}
        <div className="edit-profile__fields">
          <div className="edit-profile__row">
            <div className="edit-profile__field">
              <label className="edit-profile__label" htmlFor="name">Nombre</label>
              <input
                id="name"
                className="edit-profile__input"
                type="text"
                {...register("name", { required: "El nombre es obligatorio" })}
              />
              {errors.name && (
                <p className="edit-profile__error">{errors.name.message}</p>
              )}
            </div>

            <div className="edit-profile__field">
              <label className="edit-profile__label" htmlFor="surname">Apellido</label>
              <input
                id="surname"
                className="edit-profile__input"
                type="text"
                {...register("surname")}
              />
            </div>
          </div>

          <div className="edit-profile__field">
            <label className="edit-profile__label" htmlFor="username">Handle</label>
            <div className="edit-profile__input-prefix-wrap">
              <span className="edit-profile__prefix">@</span>
              <input
                id="username"
                className="edit-profile__input edit-profile__input--with-prefix"
                type="text"
                {...register("username", {
                  pattern: {
                    value: /^[a-z0-9_]{3,20}$/,
                    message: "Solo letras minúsculas, números y _, entre 3 y 20 caracteres",
                  },
                })}
              />
            </div>
            {errors.username && (
              <p className="edit-profile__error">{errors.username.message}</p>
            )}
          </div>

          <div className="edit-profile__field">
            <label className="edit-profile__label" htmlFor="bio">
              Bio
              <span className="edit-profile__label-hint">(máx. 300 caracteres)</span>
            </label>
            <textarea
              id="bio"
              className="edit-profile__textarea"
              rows={4}
              maxLength={300}
              {...register("bio")}
            />
          </div>
        </div>

        <div className="edit-profile__actions">
          <button
            type="button"
            className="edit-profile__btn edit-profile__btn--cancel"
            onClick={() => navigate("/profile")}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="edit-profile__btn edit-profile__btn--save"
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </section>
  );
}
```

- [ ] **Step 2: Create EditProfilePage.scss**

```scss
// src/pages/EditProfilePage/EditProfilePage.scss
@use '../../styles/lib' as *;

.edit-profile {
  @include container;
  padding-top: var(--space-8);
  padding-bottom: var(--space-16);
  max-width: 680px;

  &--loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40vh;
    color: var(--color-text-secondary);
  }

  &__title {
    font-size: var(--text-2xl);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    margin-bottom: var(--space-8);
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  &__banner-upload {
    position: relative;
  }

  &__banner-preview {
    height: 160px;
    background: var(--color-bg-section);
    border-radius: var(--radius-xl);
    background-size: cover;
    background-position: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    border: 2px dashed var(--color-border-medium);
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover .edit-profile__banner-overlay {
      opacity: 1;
    }
  }

  &__banner-overlay {
    position: absolute;
    inset: 0;
    background: rgba(44, 36, 32, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    opacity: 0;
    @include transition(opacity);
  }

  &__photo-upload {
    margin-top: calc(-1 * var(--space-10));
    padding-left: var(--space-6);
  }

  &__photo-preview {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    background: var(--color-bg-section);
    border: 3px solid var(--color-bg-card-solid);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover .edit-profile__photo-overlay {
      opacity: 1;
    }
  }

  &__photo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__photo-overlay {
    position: absolute;
    inset: 0;
    background: rgba(44, 36, 32, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    opacity: 0;
    @include transition(opacity);
  }

  &__upload-hint {
    font-size: var(--text-sm);
    color: var(--color-text-tertiary);
  }

  &__file-input {
    display: none;
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__label {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  &__label-hint {
    font-weight: var(--weight-regular);
    color: var(--color-text-tertiary);
  }

  &__input {
    @include text-input;

    &--with-prefix {
      padding-left: var(--space-8);
    }
  }

  &__input-prefix-wrap {
    position: relative;
  }

  &__prefix {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-secondary);
    font-size: var(--text-md);
    pointer-events: none;
  }

  &__textarea {
    @include text-input;
    resize: vertical;
    min-height: 100px;
  }

  &__error {
    font-size: var(--text-xs);
    color: var(--color-error);
    margin: 0;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border-subtle);
  }

  &__btn {
    padding: var(--space-3) var(--space-8);
    border-radius: var(--radius-pill);
    font-size: var(--text-md);
    font-weight: var(--weight-semibold);
    cursor: pointer;
    @include transition(all);

    &--cancel {
      background: none;
      border: 1px solid var(--color-border-medium);
      color: var(--color-text-primary);
      &:hover { border-color: var(--color-border-strong); }
    }

    &--save {
      background: var(--color-accent);
      border: none;
      color: var(--color-text-on-brand);
      &:hover { background: var(--color-accent-dark); }
      &:disabled { opacity: 0.6; cursor: default; }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/EditProfilePage/
git commit -m "feat(profile): add EditProfilePage"
```

---

## Task 15: Routes + ProfileMenu wiring + smoke test

**Files:**
- Modify: `src/routes/routes.tsx`
- Modify: `src/components/ProfileMenu/ProfileMenu.tsx`

- [ ] **Step 1: Update routes.tsx**

```tsx
import App from "@/App";
import LandingPage from "@/pages/LandingPage/LandingPage";
import AuthPage from "@/pages/AuthPage/AuthPage";
import ExplorePage from "@/pages/ExplorePage/ExplorePage";
import MyLibraryPage from "@/pages/MyLibraryPage/MyLibraryPage";
import BookDetailPage from "@/pages/BookDetailPage/BookDetailPage";
import CommunityPage from "@/pages/CommunityPage/CommunityPage";
import ProfilePage from "@/pages/ProfilePage/ProfilePage";
import EditProfilePage from "@/pages/EditProfilePage/EditProfilePage";
import AuthRoute from "@/routes/AuthRoute";

export const ROUTES = [
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "auth", element: <AuthPage /> },
      { path: "explore", element: <ExplorePage /> },
      { path: "book/:id", element: <BookDetailPage /> },
      { path: "community", element: <CommunityPage /> },
      {
        path: "my-library",
        element: (
          <AuthRoute requireAuth>
            <MyLibraryPage />
          </AuthRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <AuthRoute requireAuth>
            <ProfilePage />
          </AuthRoute>
        ),
      },
      {
        path: "profile/edit",
        element: (
          <AuthRoute requireAuth>
            <EditProfilePage />
          </AuthRoute>
        ),
      },
      {
        path: "profile/:userId",
        element: <ProfilePage />,
      },
    ],
  },
];

export const NAV_LINKS = [
  { path: "/my-library", label: "nav.myLibrary" },
  { path: "/explore", label: "nav.explore" },
  { path: "/community", label: "nav.community" },
];
```

- [ ] **Step 2: Update ProfileMenu.tsx — wire "Ver perfil" to navigate**

Change the "Ver perfil" `<button>` to a `<Link>` and close the menu on click:

```tsx
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import "./ProfileMenu.scss";

interface ProfileMenuProps {
  onClose: () => void;
}

export default function ProfileMenu({ onClose }: ProfileMenuProps) {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div className="profile-menu" ref={ref}>
      <Link
        className="profile-menu__item"
        to="/profile"
        onClick={onClose}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
        Ver perfil
      </Link>

      <button className="profile-menu__item" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        Ajustes
      </button>

      <button className="profile-menu__item" type="button" onClick={toggleTheme}>
        {theme === "light" ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        )}
        {theme === "light" ? "Tema oscuro" : "Tema claro"}
      </button>

      <button
        className="profile-menu__item profile-menu__item--danger"
        type="button"
        onClick={() => { logout(); onClose(); }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Cerrar sesión
      </button>
    </div>
  );
}
```

> **Note:** Check `ProfileMenu.scss` — the `.profile-menu__item` class is currently on a `<button>`. Add the same styles to `a.profile-menu__item` so the Link looks identical. Add this to `ProfileMenu.scss`:

```scss
a.profile-menu__item {
  text-decoration: none;
  color: inherit;
}
```

- [ ] **Step 3: Full smoke test**

Run `npm run dev` and verify:
1. Click profile icon in navbar → menu opens
2. Click "Ver perfil" → navigates to `/profile`
3. Profile page shows: banner area, your name, empty stats, empty favorites, your shelf, empty activity
4. Click "Editar perfil" → navigates to `/profile/edit`
5. Fill in name, handle, bio → click "Guardar cambios" → redirects back to `/profile` with updated data
6. Upload a profile photo → reloads profile page → photo appears
7. Add favorites via the editor modal → search works, books appear in section
8. Add a book to "Acabado" shelf from explore page → check Firestore Console: `Users/{uid}/activity` has a new document
9. Navigate to `/profile/{anotherUserId}` → "Seguir" button appears (not "Editar perfil")
10. Click "Seguidores" → modal opens

- [ ] **Step 4: Final commit**

```bash
git add src/routes/routes.tsx src/components/ProfileMenu/
git commit -m "feat(profile): wire routes and ProfileMenu to profile page"
```
