// src/scripts/backfill-title-norm.cjs
// Backfill del campo `titleNorm` (título normalizado por idioma) en Books.
// Necesario para la búsqueda por título exacto. Mismo patrón que backfill-title-tokens.
//   npx tsx src/scripts/backfill-title-norm.cjs --dry-run
//   npx tsx src/scripts/backfill-title-norm.cjs
const admin = require("firebase-admin");
const serviceAccount = require("../../serviceAccountKey.json");
const { buildTitleNormMap, isTitleNormUpToDate } = require("../utils/titleSearch.ts");

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
    let q = booksRef.orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE_SIZE);
    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    let batchWrites = 0;

    for (const docSnap of snap.docs) {
      scanned++;
      const data = docSnap.data();
      const expected = buildTitleNormMap(data.titles, data.title, data.langs);

      if (Object.keys(expected).length === 0) {
        skipped++;
        continue;
      }
      if (isTitleNormUpToDate(data.titleNorm, expected)) {
        skipped++;
        continue;
      }

      updated++;
      if (!DRY_RUN) {
        batch.update(docSnap.ref, { titleNorm: expected });
        batchWrites++;
      }
    }

    if (!DRY_RUN && batchWrites > 0) await batch.commit();

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE_SIZE) break;
  }

  console.log(
    `${DRY_RUN ? "[DRY-RUN] " : ""}escaneados: ${scanned}, actualizados: ${updated}, saltados: ${skipped}`
  );
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
