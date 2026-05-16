// scripts/backfill-title-tokens.cjs
// OJO: sigue necesitando tsx, porque importa un archivo .ts (el tokenizer).
//   npx tsx scripts/backfill-title-tokens.cjs --dry-run
//   npx tsx scripts/backfill-title-tokens.cjs
const admin = require("firebase-admin");
const serviceAccount = require("../../serviceAccountKey.json");
const {
  buildTitleTokensMap,
  isTitleTokensUpToDate,
  buildAuthorTokens,
  isAuthorTokensUpToDate,
} = require("../utils/titleSearch.ts");

const DRY_RUN = process.argv.includes("--dry-run");
const PAGE_SIZE = 400;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
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
      const expectedTitle = buildTitleTokensMap(data.titles, data.title, data.langs);
      const expectedAuthor = buildAuthorTokens(data.authors ?? []);

      const titleEmpty = Object.keys(expectedTitle).length === 0;
      const authorEmpty = expectedAuthor.length === 0;
      if (titleEmpty && authorEmpty) {
        skipped++;
        continue;
      }

      const titleUpToDate = isTitleTokensUpToDate(data.titleTokens, expectedTitle);
      const authorUpToDate = isAuthorTokensUpToDate(data.authorTokens, expectedAuthor);
      if (titleUpToDate && authorUpToDate) {
        skipped++;
        continue;
      }

      updated++;
      if (!DRY_RUN) {
        batch.update(docSnap.ref, {
          titleTokens: expectedTitle,
          authorTokens: expectedAuthor,
        });
        batchWrites++;
      }
    }

    if (!DRY_RUN && batchWrites > 0) await batch.commit();

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE_SIZE) break;
  }

  console.log(
    `${DRY_RUN ? "[DRY-RUN] " : ""}escaneados: ${scanned}, ` +
      `actualizados: ${updated}, saltados: ${skipped}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
