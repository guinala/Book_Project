import type { Book } from "@/types/Book";
import { arrayUnion, collection, doc, getDoc, getDocs, increment, limit, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "./firebaseInit";
import { fetchWorkEditionByLang } from "@/services/api/openLibraryApi";

const BOOKS_COLLECTION = "Books";

// String para las sinopsis antiguas que solo estaban en español
type SynopsisField = string | Record<string, string>;

function encodeKey(workKey: string): string {
  // Ejemplo: "/works/OL123W" => "OL123W"
  return workKey.split("/").at(-1) ?? workKey;
}

export async function getExploreBooksFromDB(
  lang: string,
  minCount = 48
): Promise<Book[] | null> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("langs", "array-contains", lang),
    limit(minCount)
  );

  const books = await getDocs(q);
  if (books.size < minCount) return null;

  return books.docs.map((d) => {
    const data = d.data();
    return {
      key: data.key,
      title: data.titles?.[lang] ?? data.titles?.es ?? data.titles?.en ?? data.title ?? "",
      titles: data.titles ?? {},
      authors: data.authors,
      authorKeys: data.authorKeys ?? undefined,
      first_publish_year: data.first_publish_year,
      cover_id: data.cover_id,
      cover_url: data.cover_url ?? undefined,
      edition_count: data.edition_count,
      genre: data.genre ?? undefined,
      rating: data.rating ?? undefined,
      ratingCount: data.ratingCount ?? undefined,
      isbn: data.isbns?.[lang] ?? data.isbns?.es ?? data.isbns?.en ?? data.isbn ?? undefined,
      isbns: data.isbns ?? undefined,
      pages: data.pages ?? undefined,
    } as Book;
  });
}

export async function saveBooksToDB(
  books: Book[], 
  lang: string
): Promise<void> {
    const batch = writeBatch(db);

    for (const book of books) {
      const ref = doc(db, BOOKS_COLLECTION, encodeKey(book.key));

      batch.set(ref, {
        key: book.key,
        authors: book.authors,
        first_publish_year: book.first_publish_year,
        cover_id: book.cover_id,
        cover_url: book.cover_url ?? null,
        edition_count: book.edition_count,
        genre: book.genre ?? null,
        rating: book.rating ?? null,
        ratingCount: book.ratingCount ?? null,
        isbn: book.isbn ?? null,
        pages: book.pages ?? null,
        authorKeys: book.authorKeys ?? [],
        langs: arrayUnion(lang),
      }, { merge: true });
  }

  await batch.commit();

  // Asignar titulos al idioma actual
  await Promise.all(
    books.map(book =>
      updateBookTitleToDB(book.key, book.title, lang, book.isbn).catch(() => {})
    )
  );

  // Buscar titulo en otro idioma
  const otherLang = lang === 'es' ? 'en' : 'es';
  Promise.all(
    books.map(async book => {
      const edition = await fetchWorkEditionByLang(book.key, otherLang);
      if (edition) {
        await updateBookTitleToDB(book.key, edition.title, otherLang, edition.isbn);
      }
    })
  ).catch(() => {});
}

export async function getAuthorBooksFromDB(
  authorKey: string,
  excludeTitle = "",
  lang = "es"
): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("authorKeys", "array-contains", authorKey),
    limit(10)
  );
  const books = await getDocs(q);
  return books.docs
    .map(d => {
      const data = d.data();
      return {
        key: data.key,
        title: data.titles?.[lang] ?? data.titles?.es ?? data.titles?.en ?? data.title ?? "",
        authors: data.authors,
        authorKeys: data.authorKeys ?? undefined,
        first_publish_year: data.first_publish_year,
        cover_id: data.cover_id,
        cover_url: data.cover_url ?? undefined,
        edition_count: data.edition_count,
        genre: data.genre ?? undefined,
        rating: data.rating ?? undefined,
        ratingCount: data.ratingCount ?? undefined,
        isbn: data.isbns?.[lang] ?? data.isbns?.es ?? data.isbns?.en ?? data.isbn ?? undefined,
        pages: data.pages ?? undefined,
        titles: data.titles ?? {},
        isbns: data.isbns ?? undefined,
      } as Book;
    })
    .filter(b => b.title.toLowerCase() !== excludeTitle.toLowerCase());
}


export async function getSynopsisFromDB(
  workKey: string,
  lang: string
): Promise<string | null> {
  const refDoc = doc(db, BOOKS_COLLECTION, encodeKey(workKey));
  const document = await getDoc(refDoc);
  if (!document.exists()) return null;

  const synopsis = document.data().synopsis as SynopsisField | undefined;
  if(!synopsis) return null;

  //Se hace esto porque hasta ahora las sinopsis eran solo string
  if(typeof synopsis === 'string') {
    //Cambiar formato de sinopsis solo en español
    setDoc(refDoc, { synopsis: { es: synopsis } }, { merge: true }).catch(() => {});

    return lang === 'es' ? synopsis : null;
  }

  return synopsis[lang] ?? null;
}

export async function saveSynopsisToDB(
  workKey: string,
  synopsis: string,
  lang: string
): Promise<void> {
  const refDoc = doc(db, BOOKS_COLLECTION, encodeKey(workKey));
  try {
    // No se puede asignar valores a campos anidados con setDoc, por eso se utiliza updateDoc
    await updateDoc(refDoc, { [`synopsis.${lang}`]: synopsis });
  } catch {
    //Aquí se acepta porque el doc no existe en este caso
    await setDoc(refDoc, { synopsis: { [lang]: synopsis } }, { merge: true });
  }
}

//Para arreglar los generos que aun están en null
export async function saveGenreToDB(workKey: string, genre: string): Promise<void> {
  const refDoc = doc(db, BOOKS_COLLECTION, encodeKey(workKey));
  await setDoc(refDoc, { genre }, { merge: true });
}

export async function updateBookTitleToDB(
  workKey: string,
  title: string,
  lang: string,
  isbn?: string,
): Promise<void> {
  const refDoc = doc(db, BOOKS_COLLECTION, encodeKey(workKey));
  const update: Record<string, unknown> = {
    [`titles.${lang}`]: title,
    langs: arrayUnion(lang),
  };
  if (isbn) update[`isbns.${lang}`] = isbn;
  await updateDoc(refDoc, update);
}

export async function getRecommendationsFromDB(                                                                                                                             
  genre: string,
  lang: string,
  excludeKey: string,
  minCount = 20
): Promise<Book[] | null> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("genre", "==", genre),
    where("langs", "array-contains", lang),
    limit(minCount + 1) //En el filtrado se excliye el libro actual, +1 para compensar
  );

  const doc = await getDocs(q);
  const books = doc.docs
    .map((d) => {
      const data = d.data();
      return {
        key: data.key,
        title: data.titles?.[lang] ?? data.titles?.es ?? data.titles?.en ?? data.title ?? "",
        titles: data.titles ?? {},
        authors: data.authors,
        authorKeys: data.authorKeys ?? undefined,
        first_publish_year: data.first_publish_year,
        cover_id: data.cover_id,
        cover_url: data.cover_url ?? undefined,
        edition_count: data.edition_count,
        genre: data.genre ?? undefined,
        rating: data.rating ?? undefined,
        ratingCount: data.ratingCount ?? undefined,
        isbn: data.isbns?.[lang] ?? data.isbns?.es ?? data.isbns?.en ?? data.isbn ?? undefined,
        isbns: data.isbns ?? undefined,
        pages: data.pages ?? undefined,
      } as Book;
    })
    .filter((b) => b.key !== excludeKey);

  if (books.length < minCount) return null;
  return books;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBookDoc(data: Record<string, any>, lang: string): Book {
  return {
    key: data.key,
    title: data.titles?.[lang] ?? data.titles?.es ?? data.titles?.en ?? data.title ?? "",
    titles: data.titles ?? {},
    authors: data.authors,
    authorKeys: data.authorKeys ?? undefined,
    first_publish_year: data.first_publish_year,
    cover_id: data.cover_id,
    cover_url: data.cover_url ?? undefined,
    edition_count: data.edition_count,
    genre: data.genre ?? undefined,
    rating: data.rating ?? undefined,
    ratingCount: data.ratingCount ?? undefined,
    isbn: data.isbns?.[lang] ?? data.isbns?.es ?? data.isbns?.en ?? data.isbn ?? undefined,
    isbns: data.isbns ?? undefined,
    pages: data.pages ?? undefined,
  };
}

// ── Queries para secciones de Explore ────────────────────────────────────────

export async function getTrendingBooks(lang: string, count = 6): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("langs", "array-contains", lang),
    limit(100),
  );
  const snap = await getDocs(q);
  return snap.docs
    .sort((a, b) => (b.data().addCount ?? 0) - (a.data().addCount ?? 0))
    .slice(0, count)
    .map(d => mapBookDoc(d.data(), lang));
}

export async function getTopRatedBooks(lang: string, count = 6): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("langs", "array-contains", lang),
    where("rating", ">=", 3.5),
    limit(60),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .filter(b => (b.ratingCount ?? 0) >= 10)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, count);
}

export async function getBooksByGenre(genre: string, lang: string, count = 6): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("langs", "array-contains", lang),
    where("genre", "==", genre),
    limit(count + 20),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, count);
}

export async function getNewReleaseBooks(year: number, lang: string, count = 6): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("langs", "array-contains", lang),
    limit(150),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .filter(b => (b.first_publish_year ?? 0) >= year && (b.rating ?? 0) >= 3)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, count);
}

export async function getQuickAndGoodBooks(lang: string, count = 6): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("langs", "array-contains", lang),
    where("rating", ">=", 4),
    limit(80),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .filter(b => b.pages !== undefined && b.pages > 0 && b.pages < 300)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, count);
}

export async function getAuthorNewReleases(
  authorKeys: string[],
  year: number,
  lang: string,
  count = 6,
): Promise<Book[]> {
  if (authorKeys.length === 0) return [];
  const keys = authorKeys.slice(0, 10);
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("authorKeys", "array-contains-any", keys),
    limit(100),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .filter(b => (b.first_publish_year ?? 0) >= year)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, count);
}

export async function getGenreNewReleases(
  genre: string,
  year: number,
  lang: string,
  count = 6,
): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("genre", "==", genre),
    where("langs", "array-contains", lang),
    limit(count + 30),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .filter(b => (b.first_publish_year ?? 0) >= year)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, count);
}

export async function getRecommendationsByGenre(
  genre: string,
  lang: string,
  excludeKey: string,
  count = 6,
): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("genre", "==", genre),
    where("langs", "array-contains", lang),
    limit(count + 10),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .filter(b => b.key !== excludeKey)
    .slice(0, count);
}

export async function incrementBookAddCount(bookKey: string): Promise<void> {
  const ref = doc(db, BOOKS_COLLECTION, encodeKey(bookKey));
  await setDoc(ref, { addCount: increment(1) }, { merge: true });
}