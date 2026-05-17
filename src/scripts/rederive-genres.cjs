// src/scripts/rederive-genres.cjs
// Re-deriva genre/genre2 desde el campo `topics` YA guardado en cada libro.
// Úsalo tras cambiar GENRE_MAP. Es 100% local — no toca OpenLibrary.
//   npx tsx src/scripts/rederive-genres.cjs --dry-run
//   npx tsx src/scripts/rederive-genres.cjs
const admin = require("firebase-admin");
const serviceAccount = require("../../serviceAccountKey.json");
const { detectGenres } = require("../utils/genreUtils.ts");

const DRY_RUN = process.argv.includes("--dry-run");
const PAGE_SIZE = 400;

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
  const booksRef = db.collection("Books");
  let lastDoc = null;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  for (;;) {
    let q = booksRef
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(PAGE_SIZE);
    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    let batchWrites = 0;

    for (const docSnap of snap.docs) {
      scanned++;
      const data = docSnap.data();
      const topics = data.topics;

      // Sin topics → nada que re-derivar; NO se toca el genre existente
      if (!Array.isArray(topics) || topics.length === 0) {
        skipped++;
        continue;
      }

      const genres = detectGenres(topics);
      const expGenre = genres[0] ?? null;
      const expGenre2 = genres[1] ?? null;

      // Ya coincide con lo guardado → no se reescribe
      if ((data.genre ?? null) === expGenre && (data.genre2 ?? null) === expGenre2) {
        skipped++;
        continue;
      }

      updated++;
      if (!DRY_RUN) {
        batch.update(docSnap.ref, { genre: expGenre, genre2: expGenre2 });
        batchWrites++;
      }
    }

    if (!DRY_RUN && batchWrites > 0) await batch.commit();

    console.log(
      `${DRY_RUN ? "[DRY-RUN] " : ""}progreso — escaneados: ${scanned}, ` +
        `actualizados: ${updated}, saltados: ${skipped}`
    );

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE_SIZE) break;
  }

  console.log(
    `${DRY_RUN ? "[DRY-RUN] " : ""}FIN — escaneados: ${scanned}, ` +
      `actualizados: ${updated}, saltados: ${skipped}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
