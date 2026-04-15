import type { Book } from "@/types/Book";
import { arrayUnion, collection, doc, getDoc, getDocs, limit, query, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "./firebase_init";

const BOOKS_COLLECTION = "books";

function encodeKey(workKey: string): string {
  // Ejemplo: "/works/OL123W" → "works_OL123W"
  return workKey.replace(/^\//, "").replace(/\//g, "_");
}

export async function getExploreBooksFromDB(
  lang: string,
  minCount = 10
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
      key:               data.key,
      title:             data.title,
      authors:           data.authors,
      first_publish_year:data.first_publish_year,
      cover_id:          data.cover_id,
      cover_url:         data.cover_url ?? undefined,
      edition_count:     data.edition_count,
      genre:             data.genre ?? undefined,
      rating:            data.rating ?? undefined,
      ratingCount:       data.ratingCount ?? undefined,
      isbn:              data.isbn ?? undefined,
      pages:             data.pages ?? undefined,
    } as Book;
  });
}

export async function saveBooksToDB(books: Book[], lang: string): Promise<void> {
    //Agrupa las peticiones en una sola peticion, por lo que es mas eficiente
    const batch = writeBatch(db);

  for (const book of books) {
    const ref = doc(db, BOOKS_COLLECTION, encodeKey(book.key));
    batch.set(ref, {
      key:                book.key,
      title:              book.title,
      authors:            book.authors,
      first_publish_year: book.first_publish_year,
      cover_id:           book.cover_id,
      cover_url:          book.cover_url ?? null,
      edition_count:      book.edition_count,
      genre:              book.genre ?? null,
      //rating:             book.rating ?? null,
      //ratingCount:        book.ratingCount ?? null,
      isbn:               book.isbn ?? null,
      pages:              book.pages ?? null,
      langs:              arrayUnion(lang),
    }, { merge: true });
  }

  await batch.commit();
}

export async function getSynopsisFromDB(workKey: string): Promise<string | null> {
  const ref = doc(db, BOOKS_COLLECTION, encodeKey(workKey));
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return snapshot.data().synopsis ?? null;
}

export async function saveSynopsisToDB(
  workKey: string,
  synopsis: string
): Promise<void> {
  const ref = doc(db, BOOKS_COLLECTION, encodeKey(workKey));
  await setDoc(ref, { synopsis }, { merge: true });
}