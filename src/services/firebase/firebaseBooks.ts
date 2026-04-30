import type { Book } from "@/types/Book";
import { arrayUnion, collection, doc, getDoc, getDocs, limit, query, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "./firebaseInit";

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
    } as Book;
  });
}

export async function saveBooksToDB(
  books: Book[], 
  lang: string
): Promise<void> {
    //Agrupa las peticiones en una sola peticion, por lo que es mas eficiente
    const batch = writeBatch(db);
    
    for (const book of books) {
      const ref = doc(db, BOOKS_COLLECTION, encodeKey(book.key));
      batch.set(ref, {
        key: book.key,
        title: book.title,
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
}

export async function getAuthorBooksFromDB(
  authorKey: string,
  excludeTitle = ""
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
  if(typeof synopsis === 'string') return synopsis;

  return synopsis[lang] ?? synopsis['es'] ?? synopsis['en'] ?? null;
}

export async function saveSynopsisToDB(
  workKey: string,
  synopsis: string,
  lang: string
): Promise<void> {
  const refDoc = doc(db, BOOKS_COLLECTION, encodeKey(workKey));
  await setDoc(refDoc, { [`synopsis.${lang}`]: synopsis }, { merge: true });
}

//Para arreglar los generos aun en null
export async function saveGenreToDB(workKey: string, genre: string): Promise<void> {
  const refDoc = doc(db, BOOKS_COLLECTION, encodeKey(workKey));
  await setDoc(refDoc, { genre }, { merge: true });
}
