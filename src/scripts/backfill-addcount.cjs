// src/scripts/backfill-addcount.cjs
// Backfill del campo `addCount` en la colección Books.
// Para cada libro SIN `addCount`, cuenta en cuántas estanterías de usuario
// (Users/{uid}/Shelf/{bookId}) aparece y le escribe ese conteo (0 si en ninguna).
// Los libros que YA tienen `addCount` se ignoran. Solo se escribe ese campo.
//   npx tsx src/scripts/backfill-addcount.cjs --dry-run
//   npx tsx src/scripts/backfill-addcount.cjs
const admin = require("firebase-admin");
const serviceAccount = require("../../serviceAccountKey.json");

const DRY_RUN = process.argv.includes("--dry-run");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const BATCH_LIMIT = 400; // por debajo del límite de 500 escrituras/batch de Firestore

async function main() {
  // El ID de cada doc de Shelf es el ID del doc en Books, y cada usuario tiene
  // como mucho un doc por libro, así que contar docs de Shelf por ID == nº de
  // estanterías que contienen el libro.
  const shelfSnap = await db.collectionGroup("Shelf").get();
  const counts = new Map();
  for (const docSnap of shelfSnap.docs) {
    counts.set(docSnap.id, (counts.get(docSnap.id) ?? 0) + 1);
  }
  console.log(
    `Estanterías leídas: ${shelfSnap.size} entradas, ${counts.size} libros distintos.`
  );

  const booksSnap = await db.collection("Books").get();
  const toUpdate = [];
  for (const docSnap of booksSnap.docs) {
    if (docSnap.data().addCount !== undefined) continue; // ya lo tiene -> saltar
    toUpdate.push({ ref: docSnap.ref, count: counts.get(docSnap.id) ?? 0 });
  }

  const inShelves = toUpdate.filter((b) => b.count > 0).length;
  console.log(
    `${DRY_RUN ? "[DRY-RUN] " : ""}Books: ${booksSnap.size} total, ` +
      `${toUpdate.length} sin addCount ` +
      `(${inShelves} en alguna estantería, ${toUpdate.length - inShelves} en ninguna).`
  );

  for (const b of toUpdate.slice(0, 10)) {
    console.log(`${DRY_RUN ? "[DRY-RUN] " : ""}${b.ref.id} -> addCount = ${b.count}`);
  }
  if (toUpdate.length > 10) console.log(`  ... y ${toUpdate.length - 10} más.`);

  let updated = 0;
  if (!DRY_RUN) {
    for (let i = 0; i < toUpdate.length; i += BATCH_LIMIT) {
      const chunk = toUpdate.slice(i, i + BATCH_LIMIT);
      const batch = db.batch();
      for (const b of chunk) batch.update(b.ref, { addCount: b.count });
      await batch.commit();
      updated += chunk.length;
    }
  }

  console.log(
    `${DRY_RUN ? "[DRY-RUN] " : ""}FIN — sin addCount: ${toUpdate.length}, actualizados: ${DRY_RUN ? 0 : updated}`
  );
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
