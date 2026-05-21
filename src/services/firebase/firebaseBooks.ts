import type { Book } from "@/types/Book";
import { arrayUnion, collection, doc, getDoc, getDocs, increment, limit, orderBy, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "./firebaseInit";
import { fetchWorkEditionByLang, searchBooks } from "@/services/api/openLibraryApi";
import { buildAuthorTokens, buildTitleTokens } from "@/utils/titleSearch";
import type { SearchFilter } from "@/types/Search";

const BOOKS_COLLECTION = "Books";

// String para las sinopsis antiguas que solo estaban en español
type SynopsisField = string | Record<string, string>;

function encodeKey(workKey: string): string {
  // "/works/OL123W" => "OL123W"
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

  // return books.docs.map((d) => {
  //   const data = d.data();
  //   return {
  //     key: data.key,
  //     title: data.titles?.[lang] ?? data.titles?.es ?? data.titles?.en ?? data.title ?? "",
  //     titles: data.titles ?? {},
  //     authors: data.authors,
  //     authorKeys: data.authorKeys ?? undefined,
  //     first_publish_year: data.first_publish_year,
  //     cover_id: data.cover_id,
  //     cover_url: data.cover_url ?? undefined,
  //     edition_count: data.edition_count,
  //     genre: data.genre ?? undefined,
  //     rating: data.rating ?? undefined,
  //     ratingCount: data.ratingCount ?? undefined,
  //     isbn: data.isbns?.[lang] ?? data.isbns?.es ?? data.isbns?.en ?? data.isbn ?? undefined,
  //     isbns: data.isbns ?? undefined,
  //     pages: data.pages ?? undefined,
  //   } as Book;
  // });
  return books.docs.map((d) => mapBookDoc(d.data(), lang));
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
        authorTokens: buildAuthorTokens(book.authors ?? []),
        first_publish_year: book.first_publish_year,
        cover_id: book.cover_id,
        cover_url: book.cover_url ?? null,
        edition_count: book.edition_count,
        genre: book.genre ?? null,
        genre2: book.genre2 ?? null,
        topics: book.topics ?? [],
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
    orderBy("rating", "desc"),
    limit(10)
  );
  const books = await getDocs(q);
  // return books.docs
  //   .map(d => {
  //     const data = d.data();
  //     return {
  //       key: data.key,
  //       title: data.titles?.[lang] ?? data.titles?.es ?? data.titles?.en ?? data.title ?? "",
  //       authors: data.authors,
  //       authorKeys: data.authorKeys ?? undefined,
  //       first_publish_year: data.first_publish_year,
  //       cover_id: data.cover_id,
  //       cover_url: data.cover_url ?? undefined,
  //       edition_count: data.edition_count,
  //       genre: data.genre ?? undefined,
  //       rating: data.rating ?? undefined,
  //       ratingCount: data.ratingCount ?? undefined,
  //       isbn: data.isbns?.[lang] ?? data.isbns?.es ?? data.isbns?.en ?? data.isbn ?? undefined,
  //       pages: data.pages ?? undefined,
  //       titles: data.titles ?? {},
  //       isbns: data.isbns ?? undefined,
  //     } as Book;
  //   })
  //   .filter(b => b.title.toLowerCase() !== excludeTitle.toLowerCase());
  return books.docs
  .map((d) => mapBookDoc(d.data(), lang))
  .filter((b) => b.title.toLowerCase() !== excludeTitle.toLowerCase());
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
    [`titleTokens.${lang}`]: buildTitleTokens(title),
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
    limit(minCount + 1) // En el filtrado se excliye el libro actual, +1 para compensar
  );

  const doc = await getDocs(q);
  // const books = doc.docs
  //   .map((d) => {
  //     const data = d.data();
  //     return {
  //       key: data.key,
  //       title: data.titles?.[lang] ?? data.titles?.es ?? data.titles?.en ?? data.title ?? "",
  //       titles: data.titles ?? {},
  //       authors: data.authors,
  //       authorKeys: data.authorKeys ?? undefined,
  //       first_publish_year: data.first_publish_year,
  //       cover_id: data.cover_id,
  //       cover_url: data.cover_url ?? undefined,
  //       edition_count: data.edition_count,
  //       genre: data.genre ?? undefined,
  //       rating: data.rating ?? undefined,
  //       ratingCount: data.ratingCount ?? undefined,
  //       isbn: data.isbns?.[lang] ?? data.isbns?.es ?? data.isbns?.en ?? data.isbn ?? undefined,
  //       isbns: data.isbns ?? undefined,
  //       pages: data.pages ?? undefined,
  //     } as Book;
  //   })
  //   .filter((b) => b.key !== excludeKey);
  const books = doc.docs
  .map((d) => mapBookDoc(d.data(), lang))
  .filter((b) => b.key !== excludeKey);

  if (books.length < minCount) return null;
  return books;
}

// Helpers
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
    genre2: data.genre2 ?? undefined,
    topics: data.topics ?? undefined,
    rating: data.rating ?? undefined,
    ratingCount: data.ratingCount ?? undefined,
    isbn: data.isbns?.[lang] ?? data.isbns?.es ?? data.isbns?.en ?? data.isbn ?? undefined,
    isbns: data.isbns ?? undefined,
    pages: data.pages ?? undefined,
  };
}

// Queries para Explore
export async function getTrendingBooks(lang: string, count = 6): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("langs", "array-contains", lang),
    where("addCount", ">", 0),
    orderBy("addCount", "desc"),
    limit(100),
  );
  const snap = await getDocs(q);

  // Antes en el return habia .sort((a, b) => (b.data().addCount ?? 0) - (a.data().addCount ?? 0))
  return snap.docs
    .slice(0, count)
    .map(d => mapBookDoc(d.data(), lang));
}

export async function getTopRatedBooks(lang: string, count = 6): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("langs", "array-contains", lang),
    where("rating", ">=", 3.5),
    orderBy("rating", "desc"),
    limit(60),
  );
  const snap = await getDocs(q);

  //.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .filter(b => (b.ratingCount ?? 0) >= 10)
    .slice(0, count);
}

export async function getTopAuthorBooks(authorKey: string, lang: string, minCount = 4): Promise<Book[]> {
  const books = await getAuthorBooksFromDB(authorKey, "", lang);
  return books.length < minCount ? [] : books;
}

export async function getPopularAuthorWithBooks(
  lang: string,
): Promise<{ authorKey: string; authorName: string; books: Book[] } | null> {
  const trending = await getTrendingBooks(lang, 8);
  const candidates = trending.filter(
    b => b.authorKeys?.length && b.authors.length,
  );
  const results = await Promise.all(
    candidates.slice(0, 5).map(async b => {
      const authorKey = b.authorKeys![0];
      const authorName = b.authors[0];
      const books = await getTopAuthorBooks(authorKey, lang, 4);
      return books.length >= 4 ? { authorKey, authorName, books } : null;
    }),
  );
  return results.find(r => r !== null) ?? null;
}

export async function getBooksByGenre(genre: string, lang: string, count = 6): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("langs", "array-contains", lang),
    where("genre", "==", genre),
    orderBy("rating", "desc"),
    limit(count + 20),
  );
  const snap = await getDocs(q);

  //Antes en el return habia .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .slice(0, count);
}

export async function getNewReleaseBooks(year: number, lang: string, count = 6): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("langs", "array-contains", lang),
    orderBy("first_publish_year", "desc"), 
    orderBy("rating", "desc"),
    limit(150),
  );
  const snap = await getDocs(q);
  //.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .filter(b => (b.first_publish_year ?? 0) >= year && (b.rating ?? 0) >= 3)
    .slice(0, count);
}

export async function getQuickAndGoodBooks(lang: string, count = 6): Promise<Book[]> {
  const q = query(
    collection(db, BOOKS_COLLECTION),
    where("langs", "array-contains", lang),
    where("rating", ">=", 4),
    orderBy("rating", "desc"),
    limit(80),
  );
  const snap = await getDocs(q);
  //.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .filter(b => b.pages !== undefined && b.pages > 0 && b.pages < 300)
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
    orderBy("first_publish_year", "desc"),
    limit(100),
  );
  const snap = await getDocs(q);
  //.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .filter(b => (b.first_publish_year ?? 0) >= year - 2)
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
    orderBy("first_publish_year", "desc"),
    limit(count + 30),
  );
  const snap = await getDocs(q);
  //.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  return snap.docs
    .map(d => mapBookDoc(d.data(), lang))
    .filter(b => (b.first_publish_year ?? 0) >= year - 2)
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
    orderBy("rating", "desc"),
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

// export async function searchBooksFromDB(
//   queryText: string,
//   lang: string,
//   maxResults = 8
// ): Promise<Book[]> {
//   const words = normalizeTitleForSearch(queryText)
//     .split(/\s+/)
//     .filter(Boolean);
//   if (words.length === 0) return [];

//   const collectionRef = collection(db, BOOKS_COLLECTION);
//   const tokenField = `titleTokens.${lang}`;
//   const constraints =
//     words.length === 1
//       ? [
//           where(tokenField, "array-contains", words[0]),
//           limit(maxResults),
//         ]
//       : [
//           where(tokenField, "array-contains-any", words.slice(0, 10)),
//           limit(maxResults),
//         ];

//   const snap = await getDocs(query(collectionRef, ...constraints));
//   return snap.docs.map((d) => mapBookDoc(d.data(), lang));
// }
export async function searchBooksFromDB(
  queryText: string,
  lang: string,
  maxResults = 8
): Promise<Book[]> {

  const words = buildTitleTokens(queryText);
  if (words.length === 0) return [];

  const collectionRef = collection(db, BOOKS_COLLECTION);
  const tokenField = `titleTokens.${lang}`;
  const FETCH_LIMIT = 40; 

  const constraints =
    words.length === 1
      ? [where(tokenField, "array-contains", words[0]), limit(FETCH_LIMIT)]
      : [where(tokenField, "array-contains-any", words.slice(0, 10)), limit(FETCH_LIMIT)];

  const snap = await getDocs(query(collectionRef, ...constraints));

  const scored = snap.docs.map((d) => {
    const data = d.data();
    const tokens: string[] = data.titleTokens?.[lang] ?? [];
    let score = 0;
    for (const w of words) {
      if (tokens.includes(w)) score++;
    }
    return { book: mapBookDoc(data, lang), score };
  });

  // Primero los que reúnen más coincidencias
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map((s) => s.book);
}


export async function searchBooksWithFallback(
  queryText: string,
  lang: string,
  maxResults = 8,
  signal?: AbortSignal
): Promise<Book[]> {

  if (buildTitleTokens(queryText).length === 0) return []; // Solo stopwords o palabras vacías
  const fromDb = await searchBooksFromDB(queryText, lang, maxResults);

  if (fromDb.length > 2) return fromDb;

  // <= 2 -> OpenLibrary
  const dbKeys = new Set(fromDb.map((b) => b.key));
  const remaining = maxResults - fromDb.length;
  const effectiveSignal = signal ?? new AbortController().signal;

  // const { books: fromApi } = await searchBooks(
  //   { q: queryText },
  //   remaining + dbKeys.size, // pedir de más por si hay solapamiento con BBDD
  //   lang,
  //   effectiveSignal
  // );
  let fromApi: Book[] = [];
  try {
    const res = await searchBooks(
      { q: queryText },
      remaining + dbKeys.size,
      lang,
      effectiveSignal
    );
    fromApi = res.books;
  } catch {
    return fromDb;
  }

  const apiUnique = fromApi.filter((b) => !dbKeys.has(b.key));
  const toShow = apiUnique.slice(0, remaining);
  if (toShow.length === 0) return fromDb;

  await saveBooksToDB(toShow, lang).catch(() => {});

  return [...fromDb, ...toShow].slice(0, maxResults);
}

export async function searchBooksByAuthorFromDB(
  queryText: string,
  lang: string,
  maxResults = 20
): Promise<Book[]> {
  const words = buildTitleTokens(queryText);
  if (words.length === 0) return [];

  const collectionRef = collection(db, BOOKS_COLLECTION);
  const FETCH_LIMIT = 60;

  const constraints =
    words.length === 1
      ? [where("authorTokens", "array-contains", words[0]), limit(FETCH_LIMIT)]
      : [where("authorTokens", "array-contains-any", words.slice(0, 10)), limit(FETCH_LIMIT)];

  const snap = await getDocs(query(collectionRef, ...constraints));

  const scored = snap.docs.map((d) => {
    const data = d.data();
    const tokens: string[] = data.authorTokens ?? [];
    let score = 0;
    for (const w of words) {
      if (tokens.includes(w)) score++;
    }
    return { book: mapBookDoc(data, lang), score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map((s) => s.book);
}

export async function searchBooksByIsbnFromDB(
  isbnQuery: string,
  lang: string,
  maxResults = 20
): Promise<Book[]> {
  const isbn = isbnQuery.replace(/-/g, "").trim();
  if (isbn.length === 0) return [];

  const snap = await getDocs(
    query(
      collection(db, BOOKS_COLLECTION),
      where("isbn", "==", isbn),
      limit(maxResults)
    )
  );
  return snap.docs.map((d) => mapBookDoc(d.data(), lang));
}

export async function searchBooksInDB(
  queryText: string,
  filter: SearchFilter,
  lang: string,
  maxResults = 20
): Promise<Book[]> {
  switch (filter) {
    case "autor":
      return searchBooksByAuthorFromDB(queryText, lang, maxResults);
    case "isbn":
      return searchBooksByIsbnFromDB(queryText, lang, maxResults);
    case "titulo":
    case "todo":
    default:
      return searchBooksFromDB(queryText, lang, maxResults);
  }
}

export async function getBookFromDB(
  workKey: string,
  lang: string
): Promise<Book | null> {
  const refDoc = doc(db, BOOKS_COLLECTION, encodeKey(workKey));
  const document = await getDoc(refDoc);
  if (!document.exists()) return null;
  return mapBookDoc(document.data(), lang);
}

