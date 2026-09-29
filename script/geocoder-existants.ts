// Rattrapage : place sur la carte les activités existantes qui n'ont pas encore de coordonnées.
// Usage : DATABASE_URL=... [ANTHROPIC_API_KEY=...] npx tsx script/geocoder-existants.ts [--dry] [--trip=ID]
// Ne modifie que latitude/longitude (si absentes), address et googleMapsUrl (si absents).
// Les titres saisis à la main sont souvent descriptifs (« Déjeuner fruits de mer face à la mer ») : si une clé
// Anthropic est présente, un modèle léger extrait d'abord le nom du lieu réel (ou null s'il n'y en a pas),
// puis le géocodage travaille sur ce nom. Sans clé, on géocode le titre tel quel.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { db, pool } from "../server/db";
import { activities, days, trips } from "@shared/schema";
import { and, eq, isNull, or } from "drizzle-orm";
import { geocoderLieu, geocoderVille, lienGoogleMaps, type Centre } from "../server/geocode";

const dry = process.argv.includes("--dry");
const tripArg = process.argv.find((a) => a.startsWith("--trip="));
const tripId = tripArg ? Number(tripArg.split("=")[1]) : null;

// Extraction en lot : tâche d'extraction simple et volumineuse, un modèle léger suffit.
const MODELE_EXTRACTION = process.env.AI_MODEL_EXTRACTION || "claude-haiku-4-5";

type Ligne = { id: number; title: string; city: string; destination: string };

const SchemaExtraction = z.object({
  lieux: z.array(
    z.object({
      id: z.number().int(),
      placeName: z.string().nullable().describe("Nom exact du lieu réel tel qu'il apparaît sur une carte, ou null si le titre ne désigne aucun lieu précis"),
    }),
  ),
});

async function extraireNomsDeLieux(lignes: Ligne[]): Promise<Map<number, string | null>> {
  const noms = new Map<number, string | null>();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("(pas de ANTHROPIC_API_KEY : géocodage des titres bruts)");
    return noms;
  }
  const client = new Anthropic();
  const systeme = `Pour chaque activité de voyage (titre, ville, pays), donne le nom exact du LIEU RÉEL tel qu'on le trouve sur une carte : monument, musée, restaurant, hôtel, marché, gare, aéroport, plage, quartier, point de vue.
Retire les mots d'action et de contexte (« Déjeuner », « Check-in », « Visite de », « Sunset à », « Dîner … face à la mer »). Garde le nom dans sa forme cartographique (langue locale ou anglais), ajoute la ville si le nom seul est ambigu.
Si le titre ne désigne aucun lieu précis (trajet en bus, vol, nuit dans le bus, « dîner poisson grillé » sans nom de restaurant, activité générique), placeName = null. N'invente jamais de lieu.`;
  const TAILLE_LOT = 40;
  for (let i = 0; i < lignes.length; i += TAILLE_LOT) {
    const lot = lignes.slice(i, i + TAILLE_LOT).map((l) => ({ id: l.id, title: l.title, city: l.city, country: l.destination }));
    const reponse = await client.messages.parse({
      model: MODELE_EXTRACTION,
      max_tokens: 4000,
      system: systeme,
      messages: [{ role: "user", content: JSON.stringify(lot) }],
      output_config: { format: zodOutputFormat(SchemaExtraction) },
    });
    for (const l of reponse.parsed_output?.lieux || []) noms.set(l.id, l.placeName);
    console.log(`(extraction ${MODELE_EXTRACTION} : lot ${i / TAILLE_LOT + 1}, ${reponse.usage.input_tokens}+${reponse.usage.output_tokens} tokens)`);
  }
  return noms;
}

async function main() {
  const conditions = [or(isNull(activities.latitude), isNull(activities.longitude))];
  if (tripId) conditions.push(eq(trips.id, tripId));

  const lignes = await db
    .select({
      id: activities.id,
      title: activities.title,
      address: activities.address,
      googleMapsUrl: activities.googleMapsUrl,
      city: days.city,
      destination: trips.destination,
      tripId: trips.id,
      tripTitle: trips.title,
    })
    .from(activities)
    .innerJoin(days, eq(activities.dayId, days.id))
    .innerJoin(trips, eq(days.tripId, trips.id))
    .where(and(...conditions));

  console.log(`${lignes.length} activité(s) sans coordonnées${tripId ? ` dans le voyage ${tripId}` : ""}${dry ? " (simulation)" : ""}`);
  if (!lignes.length) return;

  const noms = await extraireNomsDeLieux(lignes);

  const centres = new Map<string, Centre | null>();
  let placees = 0;
  let sansLieu = 0;
  for (const l of lignes) {
    const extrait = noms.has(l.id) ? noms.get(l.id) : undefined;
    if (extrait === null) {
      sansLieu++;
      console.log(`  [${l.tripTitle}] ${l.city} · ${l.title} → (pas un lieu)`);
      continue;
    }
    const nom = extrait || l.title;
    const cle = `${l.city}|${l.destination}`;
    if (!centres.has(cle)) centres.set(cle, await geocoderVille(l.city, l.destination));
    const point = await geocoderLieu({ nom, ville: l.city, pays: l.destination, centre: centres.get(cle) });
    const etat = point ? `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)} (${point.source})` : "introuvable";
    console.log(`  [${l.tripTitle}] ${l.city} · ${l.title}${extrait ? ` ⇒ ${extrait}` : ""} → ${etat}`);
    if (!point) continue;
    placees++;
    if (dry) continue;
    await db
      .update(activities)
      .set({
        latitude: point.latitude,
        longitude: point.longitude,
        address: l.address || point.address || null,
        googleMapsUrl: l.googleMapsUrl || lienGoogleMaps(nom, l.city),
      })
      .where(eq(activities.id, l.id));
  }
  console.log(`\n${placees}/${lignes.length} placée(s), ${sansLieu} sans lieu précis${dry ? ", rien écrit (simulation)" : ""}`);
}

main()
  .catch((e) => {
    console.error("ÉCHEC :", e?.status || "", e?.message || e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
