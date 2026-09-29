// Génération d'un voyage complet par l'IA, en plusieurs appels courts :
//   1. le squelette (titre, pays, jours/villes, checklist) ;
//   2. chaque journée en parallèle (activités avec le nom exact des lieux) ;
//   3. géocodage des lieux (Photon puis Nominatim, puis l'estimation IA) pour remplir la carte.
// Le résultat garde exactement la forme attendue par POST /api/admin/create-from-ai.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4"; // le helper zodOutputFormat attend des schémas zod v4 (fournis par zod ≥ 3.25 sous "zod/v4")
import pLimit from "p-limit";
import { geocoderLieu, geocoderVille, lienGoogleMaps, type Centre } from "../geocode";

export const MODELE_IA = process.env.AI_MODEL || "claude-opus-5";
const PARALLELISME_JOURS = 6;

// Tarifs $/M tokens (entrée, sortie) pour l'estimation de coût affichée dans meta.
const TARIFS: Record<string, [number, number]> = {
  "claude-opus-5": [5, 25],
  "claude-sonnet-5": [2, 10],
  "claude-sonnet-4-5": [3, 15],
  "claude-haiku-4-5": [1, 5],
};

const ICONES = ["plane", "hotel", "utensils", "camera", "train", "ship", "mountain", "waves", "glasses", "anchor", "sparkles", "heart", "shopping-bag", "droplets"] as const;
const TYPES = ["activity", "food", "hotel", "transport", "shopping", "nightlife"] as const;
const CATEGORIES = ["Documents", "Santé", "Tech", "Vêtements", "Finance", "Pratique"] as const;
const PHASES = ["before", "week", "pack"] as const;
const SOUS_CATEGORIES = ["essentiels", "vetements", "toilette", "tech", "confort"] as const;

const SchemaSquelette = z.object({
  title: z.string().describe("Titre du voyage, court et évocateur"),
  subtitle: z.string().describe("Sous-titre d'une ligne"),
  destination: z.string().describe("Pays (ou pays principal) du voyage"),
  coverEmoji: z.string().describe("Un seul emoji représentant le voyage"),
  currency: z.string().describe("Symbole de la devise utilisée pour tous les montants, ex. €"),
  travelers: z.number().int().describe("Nombre de voyageurs"),
  totalBudget: z.number().describe("Budget total réaliste pour tout le groupe, hors vols internationaux"),
  days: z.array(
    z.object({
      dayNumber: z.number().int(),
      dateLabel: z.string().describe("Libellé court du jour, ex. « Jour 1 » ou « Sam. 12 avril »"),
      city: z.string().describe("Ville où se passe l'essentiel de la journée, nom usuel en français"),
      color: z.string().describe("Couleur hex vive (#RRGGBB), la même pour tous les jours d'une même ville"),
      theme: z.string().describe("Fil rouge de la journée en une phrase"),
    }),
  ),
  checklist: z.array(
    z.object({
      category: z.enum(CATEGORIES),
      text: z.string(),
      isCritical: z.boolean(),
      phase: z.enum(PHASES).describe("before = bien avant, week = la semaine avant, pack = dans la valise"),
      hint: z.string().nullable().describe("Conseil optionnel, 15 mots max"),
      subcategory: z.enum(SOUS_CATEGORIES).nullable().describe("Uniquement pour la phase pack"),
    }),
  ),
});

const SchemaJour = z.object({
  activities: z.array(
    z.object({
      time: z.string().describe("Heure de début au format HH:MM"),
      title: z.string().describe("Titre court en français, ex. « Visite du Wat Pho »"),
      placeName: z.string().describe("Nom exact du lieu réel tel qu'il apparaît sur une carte (nom officiel local ou anglais, pas de traduction ni de paraphrase)"),
      address: z.string().nullable().describe("Adresse si connue avec certitude, sinon null"),
      latitude: z.number().nullable().describe("Latitude approximative du lieu si connue, sinon null"),
      longitude: z.number().nullable().describe("Longitude approximative du lieu si connue, sinon null"),
      icon: z.enum(ICONES),
      duration: z.string().describe("Durée, ex. « 2h » ou « 45 min »"),
      cost: z.number().describe("Coût estimé pour tout le groupe dans la devise du voyage, 0 si gratuit"),
      type: z.enum(TYPES),
      note: z.string().describe("Conseil pratique court, 15 mots max"),
      isPersonal: z.boolean().describe("true pour un bon plan hors des sentiers battus, environ 1 activité sur 5"),
    }),
  ),
  tips: z.array(z.string()).describe("1 à 2 conseils pour la journée"),
  budget: z.object({
    hotel: z.number(),
    food: z.number(),
    transport: z.number(),
    activities: z.number(),
    other: z.number(),
  }).describe("Budget de la journée pour tout le groupe, dans la devise du voyage"),
});

type Squelette = z.infer<typeof SchemaSquelette>;
type Jour = z.infer<typeof SchemaJour>;

const SYSTEME_SQUELETTE = `Tu es un travel planner professionnel francophone. À partir du brief du client, tu conçois l'ARCHITECTURE d'un voyage : titre, sous-titre, pays, emoji, devise, nombre de voyageurs, budget total réaliste, et la liste des jours.
Règles :
- Respecte la durée demandée. Si elle n'est pas précisée, choisis une durée cohérente entre 4 et 10 jours.
- Enchaîne les villes de façon logique et géographique, sans aller-retour inutile ; le premier jour est l'arrivée, le dernier le départ.
- Une couleur hex vive par ville, identique pour tous les jours passés dans cette ville.
- Le fil rouge de chaque journée guide la génération détaillée qui suivra : sois concret (quartier, ambiance, temps fort).
- Checklist de 10 à 15 éléments répartis dans les trois phases, adaptés à la destination et à la saison.
- Tout en français.`;

const SYSTEME_JOUR = `Tu détailles UNE journée d'un voyage déjà architecturé, pour un travel planner francophone.
Règles :
- 4 à 6 activités variées et réalistes (culture, nourriture, nature, transport, et l'hébergement le jour d'arrivée dans une nouvelle ville), horaires cohérents, temps de trajet plausibles.
- placeName est LE point clé : le nom exact d'un lieu réel qui existe sur une carte (monument, restaurant, marché, gare, hôtel…), écrit comme sur la carte. Jamais un lieu inventé ni une description vague.
- Si tu connais les coordonnées du lieu, donne-les (approximatives acceptées), sinon null.
- Environ une activité sur cinq est un bon plan (isPersonal true).
- Ne reprends pas les lieux déjà prévus les autres jours.
- Coûts pour tout le groupe, dans la devise du voyage. Budget du jour cohérent avec les activités.
- Notes et conseils courts. Tout en français.`;

export type ResultatGeneration = {
  title: string;
  subtitle: string;
  destination: string;
  coverEmoji: string;
  totalBudget: number;
  currency: string;
  travelers: number;
  days: Array<{
    dayNumber: number;
    dateLabel: string;
    city: string;
    color: string;
    theme: string;
    activities: Array<{
      time: string;
      title: string;
      placeName: string;
      icon: string;
      duration: string;
      cost: number;
      type: string;
      note: string;
      isPersonal: boolean;
      address: string | null;
      latitude: number | null;
      longitude: number | null;
      googleMapsUrl: string;
    }>;
    tips: string[];
    budget: Jour["budget"];
  }>;
  checklist: Squelette["checklist"];
  meta: {
    model: string;
    dureeMs: number;
    inputTokens: number;
    outputTokens: number;
    coutEstimeUsd: number;
    lieux: number;
    lieuxGeocodes: number;
    joursEnErreur: number[];
  };
};

function supporteEffort(modele: string): boolean {
  return /(opus-5|sonnet-5|fable-5|opus-4-[678]|sonnet-4-6)/.test(modele);
}

function coutUsd(modele: string, entree: number, sortie: number): number {
  const [pe, ps] = TARIFS[modele] || TARIFS["claude-opus-5"];
  return (entree * pe + sortie * ps) / 1_000_000;
}

async function genererJour(client: Anthropic, description: string, squelette: Squelette, jour: Squelette["days"][number]): Promise<Jour> {
  const autresJours = squelette.days
    .filter((j) => j.dayNumber !== jour.dayNumber)
    .map((j) => `Jour ${j.dayNumber} (${j.city}) : ${j.theme}`)
    .join("\n");
  const contenu = `Brief du client :
${description}

Voyage : ${squelette.title} — ${squelette.destination}, ${squelette.travelers} voyageur(s), devise ${squelette.currency}, ${squelette.days.length} jours.

Les autres journées (à ne pas répéter) :
${autresJours || "(aucune)"}

JOURNÉE À DÉTAILLER : Jour ${jour.dayNumber} (${jour.dateLabel}) à ${jour.city}. Fil rouge : ${jour.theme}`;

  const requete: Parameters<typeof client.messages.parse>[0] = {
    model: MODELE_IA,
    max_tokens: 6000,
    system: SYSTEME_JOUR,
    messages: [{ role: "user", content: contenu }],
    output_config: { format: zodOutputFormat(SchemaJour), ...(supporteEffort(MODELE_IA) ? { effort: "medium" as const } : {}) },
  };

  let derniereErreur: unknown = null;
  for (let essai = 0; essai < 2; essai++) {
    try {
      const reponse = await client.messages.parse(requete);
      cumul.input += reponse.usage.input_tokens;
      cumul.output += reponse.usage.output_tokens;
      if (reponse.parsed_output) return reponse.parsed_output;
      derniereErreur = new Error(`Réponse non conforme au schéma (stop_reason ${reponse.stop_reason})`);
    } catch (e) {
      derniereErreur = e;
      if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw e;
    }
  }
  throw derniereErreur instanceof Error ? derniereErreur : new Error(String(derniereErreur));
}

// Compteur de tokens partagé pendant une génération (une génération à la fois par requête HTTP ; les appels
// parallèles d'une même génération l'incrémentent, ce qui est le but).
let cumul = { input: 0, output: 0 };

export async function generateTrip(description: string, options: { onEtape?: (message: string) => void } = {}): Promise<ResultatGeneration> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (!apiKey) throw Object.assign(new Error("ANTHROPIC_API_KEY manquante"), { status: 401 });
  const client = new Anthropic({
    apiKey,
    ...(process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL ? { baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL } : {}),
    timeout: 180_000,
    maxRetries: 2,
  });
  const etape = options.onEtape || (() => {});
  const debut = Date.now();
  cumul = { input: 0, output: 0 };

  // 1. Squelette
  etape("Architecture du voyage");
  const reponseSquelette = await client.messages.parse({
    model: MODELE_IA,
    max_tokens: 8000,
    system: SYSTEME_SQUELETTE,
    messages: [{ role: "user", content: description }],
    output_config: { format: zodOutputFormat(SchemaSquelette) },
  });
  cumul.input += reponseSquelette.usage.input_tokens;
  cumul.output += reponseSquelette.usage.output_tokens;
  const squelette = reponseSquelette.parsed_output;
  if (!squelette || !squelette.days.length) {
    throw new Error("L'IA n'a pas pu structurer le voyage. Précisez la destination et la durée, puis réessayez.");
  }
  squelette.days.sort((a, b) => a.dayNumber - b.dayNumber);

  // 2. Journées en parallèle
  etape(`Détail des ${squelette.days.length} journées`);
  const limite = pLimit(PARALLELISME_JOURS);
  const joursEnErreur: number[] = [];
  const jours = await Promise.all(
    squelette.days.map((j) =>
      limite(async (): Promise<Jour> => {
        try {
          return await genererJour(client, description, squelette, j);
        } catch (e) {
          if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw e;
          console.error(`[AI Generate] Jour ${j.dayNumber} en erreur :`, e instanceof Error ? e.message : e);
          joursEnErreur.push(j.dayNumber);
          return { activities: [], tips: ["Journée à compléter : la génération de ce jour a échoué, relancez-la ou ajoutez les activités à la main."], budget: { hotel: 0, food: 0, transport: 0, activities: 0, other: 0 } };
        }
      }),
    ),
  );

  // 3. Géocodage
  etape("Placement des lieux sur la carte");
  const centres = new Map<string, Centre | null>();
  await Promise.all(
    Array.from(new Set(squelette.days.map((j) => j.city))).map(async (ville) => {
      centres.set(ville, await geocoderVille(ville, squelette.destination));
    }),
  );

  let lieux = 0;
  let lieuxGeocodes = 0;
  const days = await Promise.all(
    squelette.days.map(async (j, i) => {
      const jour = jours[i];
      const centre = centres.get(j.city) ?? null;
      const activities = await Promise.all(
        jour.activities.map(async (a) => {
          lieux++;
          const nom = a.placeName?.trim() || a.title;
          const approx = a.latitude != null && a.longitude != null ? { latitude: a.latitude, longitude: a.longitude } : null;
          const point = await geocoderLieu({ nom, ville: j.city, pays: squelette.destination, centre, approx });
          if (point) lieuxGeocodes++;
          return {
            time: a.time,
            title: a.title,
            placeName: nom,
            icon: a.icon,
            duration: a.duration,
            cost: Math.max(0, Math.round(a.cost)),
            type: a.type,
            note: a.note,
            isPersonal: a.isPersonal,
            address: point?.address ?? a.address ?? null,
            latitude: point?.latitude ?? null,
            longitude: point?.longitude ?? null,
            googleMapsUrl: lienGoogleMaps(nom, j.city),
          };
        }),
      );
      return {
        dayNumber: j.dayNumber,
        dateLabel: j.dateLabel,
        city: j.city,
        color: j.color,
        theme: j.theme,
        activities,
        tips: jour.tips,
        budget: jour.budget,
      };
    }),
  );

  const dureeMs = Date.now() - debut;
  const meta = {
    model: MODELE_IA,
    dureeMs,
    inputTokens: cumul.input,
    outputTokens: cumul.output,
    coutEstimeUsd: Math.round(coutUsd(MODELE_IA, cumul.input, cumul.output) * 1000) / 1000,
    lieux,
    lieuxGeocodes,
    joursEnErreur,
  };
  console.log(`[AI Generate] ${squelette.days.length} jours, ${lieux} lieux (${lieuxGeocodes} géocodés) en ${Math.round(dureeMs / 1000)} s, ${cumul.input}+${cumul.output} tokens ≈ ${meta.coutEstimeUsd} $ (${MODELE_IA})`);

  return {
    title: squelette.title,
    subtitle: squelette.subtitle,
    destination: squelette.destination,
    coverEmoji: squelette.coverEmoji,
    totalBudget: Math.max(0, Math.round(squelette.totalBudget)),
    currency: squelette.currency,
    travelers: squelette.travelers,
    days,
    checklist: squelette.checklist,
    meta,
  };
}
