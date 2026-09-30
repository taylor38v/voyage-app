// Rattrapage : ajoute une photo Wikipedia aux activités (visites, shopping, sorties) qui n'en ont pas,
// et une photo de couverture aux voyages qui n'en ont pas.
// Usage : DATABASE_URL=... npx tsx script/photos-existants.ts [--dry] [--trip=ID]
import { db, pool } from "../server/db";
import { activities, days, trips } from "@shared/schema";
import { and, eq, isNull, or } from "drizzle-orm";
import { imageLieu, typeAvecPhoto } from "../server/images";

const dry = process.argv.includes("--dry");
const tripArg = process.argv.find((a) => a.startsWith("--trip="));
const tripId = tripArg ? Number(tripArg.split("=")[1]) : null;

async function main() {
  const conds = [or(isNull(activities.imageUrl), eq(activities.imageUrl, ""))];
  if (tripId) conds.push(eq(trips.id, tripId));
  const lignes = await db
    .select({ id: activities.id, title: activities.title, type: activities.type, lat: activities.latitude, lon: activities.longitude, city: days.city, tripTitle: trips.title })
    .from(activities)
    .innerJoin(days, eq(activities.dayId, days.id))
    .innerJoin(trips, eq(days.tripId, trips.id))
    .where(and(...conds));

  const candidates = lignes.filter((l) => typeAvecPhoto(l.type));
  console.log(`${candidates.length} activité(s) sans photo à essayer${dry ? " (simulation)" : ""}`);
  let trouvees = 0;
  for (const l of candidates) {
    const point = l.lat != null && l.lon != null ? { latitude: l.lat, longitude: l.lon } : null;
    const url = await imageLieu(l.title, l.city, point);
    console.log(`  [${l.tripTitle}] ${l.city} · ${l.title} → ${url ? "photo" : "aucune"}`);
    if (!url) continue;
    trouvees++;
    if (!dry) await db.update(activities).set({ imageUrl: url }).where(eq(activities.id, l.id));
  }

  const sansCouverture = await db
    .select({ id: trips.id, title: trips.title, destination: trips.destination })
    .from(trips)
    .where(and(or(isNull(trips.coverImageUrl), eq(trips.coverImageUrl, "")), ...(tripId ? [eq(trips.id, tripId)] : [])));
  let couvertures = 0;
  for (const t of sansCouverture) {
    const [premierJour] = await db.select({ city: days.city }).from(days).where(eq(days.tripId, t.id)).orderBy(days.dayNumber).limit(1);
    const ville = premierJour?.city?.split(/→|->/)[0].trim();
    const url = (ville ? await imageLieu(ville, t.destination) : null) || (t.destination ? await imageLieu(t.destination) : null);
    console.log(`  couverture [${t.title}] → ${url ? "photo" : "aucune"}`);
    if (!url) continue;
    couvertures++;
    if (!dry) await db.update(trips).set({ coverImageUrl: url }).where(eq(trips.id, t.id));
  }
  console.log(`\n${trouvees}/${candidates.length} photos d'activités, ${couvertures}/${sansCouverture.length} couvertures${dry ? " (rien écrit)" : ""}`);
}

main()
  .catch((e) => { console.error("ÉCHEC :", e?.message || e); process.exitCode = 1; })
  .finally(() => pool.end());
