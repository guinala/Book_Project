// src/scripts/backfill-follow-counts.cjs
//   npx tsx src/scripts/backfill-follow-counts.cjs --dry-run
//   npx tsx src/scripts/backfill-follow-counts.cjs
const admin = require("firebase-admin");
const serviceAccount = require("../../serviceAccountKey.json");

const DRY_RUN = process.argv.includes("--dry-run");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
  const users = await db.collection("Users").get();
  let scanned = 0;
  let updated = 0;

  for (const userDoc of users.docs) {
    scanned++;
    const uid = userDoc.id;
    const [followersAgg, followingAgg] = await Promise.all([
      db.collection(`Users/${uid}/followers`).count().get(),
      db.collection(`Users/${uid}/following`).count().get(),
    ]);
    const followersCount = followersAgg.data().count;
    const followingCount = followingAgg.data().count;

    const d = userDoc.data();
    if (d.followersCount === followersCount && d.followingCount === followingCount) {
      continue; // ya correcto
    }

    console.log(
      `${DRY_RUN ? "[DRY-RUN] " : ""}${uid}: ` +
        `followers ${d.followersCount ?? "?"} -> ${followersCount}, ` +
        `following ${d.followingCount ?? "?"} -> ${followingCount}`
    );

    if (!DRY_RUN) {
      await userDoc.ref.update({ followersCount, followingCount });
      updated++;
    }
  }

  console.log(
    `${DRY_RUN ? "[DRY-RUN] " : ""}FIN — escaneados: ${scanned}, corregidos: ${updated}`
  );
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
