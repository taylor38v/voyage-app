// Test local du pipeline de génération IA, sans base de données ni serveur.
// Usage : ANTHROPIC_API_KEY=... npx tsx script/test-generation.ts "4 jours à Lisbonne en couple" [fichier-sortie.json]
// Coût : un vrai appel API par jour + 1 (environ 0,30 à 0,80 $ selon la longueur et le modèle).
import { writeFileSync } from "fs";
import { generateTrip, MODELE_IA } from "../server/ai/generate-trip";

const description = process.argv[2] || "4 jours à Lisbonne en couple, budget moyen, culture et gastronomie, en mai";
const sortie = process.argv[3];

console.log(`Modèle : ${MODELE_IA}`);
console.log(`Brief  : ${description}`);
const debut = Date.now();

generateTrip(description, { onEtape: (m) => console.log(`  … ${m} (${Math.round((Date.now() - debut) / 1000)} s)`) })
  .then((trip) => {
    console.log(`\n${trip.coverEmoji} ${trip.title} — ${trip.subtitle}`);
    console.log(`${trip.destination}, ${trip.travelers} voyageur(s), budget ${trip.totalBudget} ${trip.currency}, ${trip.days.length} jours, checklist ${trip.checklist.length} items`);
    for (const j of trip.days) {
      const geo = j.activities.filter((a) => a.latitude != null).length;
      console.log(`\nJour ${j.dayNumber} · ${j.city} · ${j.theme} · ${j.activities.length} activités (${geo} placées)`);
      for (const a of j.activities) {
        const pos = a.latitude != null ? `${a.latitude.toFixed(4)},${a.longitude!.toFixed(4)}` : "NON PLACÉ";
        console.log(`  ${a.time} ${a.title} → ${a.placeName} [${pos}] ${a.cost} ${trip.currency}`);
      }
    }
    const m = trip.meta;
    console.log(`\nMeta : ${Math.round(m.dureeMs / 1000)} s, ${m.inputTokens} + ${m.outputTokens} tokens ≈ ${m.coutEstimeUsd} $, lieux ${m.lieuxGeocodes}/${m.lieux}, jours en erreur : ${m.joursEnErreur.join(", ") || "aucun"}`);
    if (sortie) {
      writeFileSync(sortie, JSON.stringify(trip, null, 2), "utf8");
      console.log(`JSON écrit : ${sortie}`);
    }
  })
  .catch((e) => {
    console.error("ÉCHEC :", e?.status || "", e?.message || e);
    process.exit(1);
  });
