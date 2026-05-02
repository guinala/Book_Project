import type { Book } from "@/types/Book";
import { arrayUnion, collection, doc, getDoc, getDocs, limit, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
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

  // Escribir titles.{lang} para el idioma actual
  await Promise.all(
    books.map(book =>
      updateBookTitleToDB(book.key, book.title, lang, book.isbn).catch(() => {})
    )
  );

  // Background: buscar título en el otro idioma y guardarlo
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

  return synopsis[lang] ?? synopsis['es'] ?? synopsis['en'] ?? null;
}

export async function saveSynopsisToDB(
  workKey: string,
  synopsis: string,
  lang: string
): Promise<void> {
  const refDoc = doc(db, BOOKS_COLLECTION, encodeKey(workKey));
  try {
    // Caso normal: el doc ya existe (libro guardado previamente vía saveBooksToDB)
    await updateDoc(refDoc, { [`synopsis.${lang}`]: synopsis });
  } catch {
    // Caso acceso directo por URL: el doc aún no existe, crearlo con setDoc
    // Se usa objeto anidado real (no dot-notation) para que synopsis.{lang} sea un mapa
    await setDoc(refDoc, { synopsis: { [lang]: synopsis } }, { merge: true });
  }
}

//Para arreglar los generos aun en null
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
    limit(minCount + 1) // +1 para compensar el excludeKey
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