// src/scripts/backfill-genres.cjs
//   npx tsx src/scripts/backfill-genres.cjs --dry-run
//   npx tsx src/scripts/backfill-genres.cjs
const admin = require("firebase-admin");
const serviceAccount = require("../../serviceAccountKey.json");
const { detectGenres } = require("../utils/genreUtils.ts");

const DRY_RUN = process.argv.includes("--dry-run");
const PAGE_SIZE = 200;       // docs leídos de Firestore por página
const CONCURRENCY = 4;       // peticiones simultáneas a OpenLibrary
const DELAY_MS = 500;        // pausa entre lotes de CONCURRENCY

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

let scanned = 0;
let updated = 0;
let skipped = 0;
let failed = 0;

async function processBook(docSnap) {
  scanned++;
  const data = docSnap.data();

  // Idempotente: si ya tiene topics, no se reprocesa
  if (Array.isArray(data.topics)) {
    skipped++;
    return;
  }

  if (!data.key) {
    failed++;
    console.warn(`  sin 'key' en doc ${docSnap.id}`);
    return;
  }

  try {
    const res = await fetch(`https://openlibrary.org${data.key}.json`);
    if (!res.ok) {
      failed++;
      console.warn(`  HTTP ${res.status} en ${data.key}`);
      return;
    }
    const work = await res.json();
    const subjects = Array.isArray(work.subjects) ? work.subjects : [];

    let payload;
    if (subjects.length === 0) {
      // Sin subjects: no se toca el genre existente, solo se marca topics
      payload = { topics: [] };
    } else {
      const genres = detectGenres(subjects);
      payload = {
        genre: genres[0] ?? null,
        genre2: genres[1] ?? null,
        topics: subjects,
      };
    }

    updated++;
    if (!DRY_RUN) {
      await docSnap.ref.update(payload);
    }
  } catch (e) {
    failed++;
    console.warn(`  error en ${data.key}: ${e.message}`);
  }
}

async function main() {
  const booksRef = db.collection("Books");
  let lastDoc = null;

  for (;;) {
    let q = booksRef
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(PAGE_SIZE);
    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) break;

    // Procesar la página en lotes de CONCURRENCY, con pausa entre lotes
    for (let i = 0; i < snap.docs.length; i += CONCURRENCY) {
      const chunk = snap.docs.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(processBook));
      await sleep(DELAY_MS);
    }

    console.log(
      `${DRY_RUN ? "[DRY-RUN] " : ""}progreso — escaneados: ${scanned}, ` +
        `actualizados: ${updated}, saltados: ${skipped}, fallidos: ${failed}`
    );

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE_SIZE) break;
  }

  console.log(
    `${DRY_RUN ? "[DRY-RUN] " : ""}FIN — escaneados: ${scanned}, ` +
      `actualizados: ${updated}, saltados: ${skipped}, fallidos: ${failed}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
