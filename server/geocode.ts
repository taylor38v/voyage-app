// Géocodage gratuit et sans clé : Photon (Komoot) en premier, Nominatim (OSM) en secours.
// Utilisé par la génération IA, la création/mise à jour manuelle d'activités et le script de rattrapage.
import { limiteur } from "./limite";

const USER_AGENT = "Voyageo/1.0 (+https://voyageo-0uv7.onrender.com)";
const RAYON_MAX_KM = 150; // au-delà, le résultat est considéré comme un homonyme d'une autre région
const DELAI_NOMINATIM_MS = 1100; // politique d'usage Nominatim : 1 requête par seconde

export type Centre = { latitude: number; longitude: number };
export type PointGeo = Centre & { address: string | null; source: "photon" | "nominatim" | "ia" };

const cache = new Map<string, PointGeo | Centre | null>();
const limitePhoton = limiteur(3);
const limiteNominatim = limiteur(1);
let dernierAppelNominatim = 0;

const MOTS_VIDES = new Set([
  "the", "le", "la", "les", "de", "du", "des", "of", "and", "et", "au", "aux", "en", "in", "at",
  "da", "di", "del", "della", "el", "los", "las", "der", "die", "das", "von", "van",
]);

function tokens(texte: string): string[] {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function tokensSignificatifs(texte: string): string[] {
  return tokens(texte).filter((t) => t.length >= 3 && !MOTS_VIDES.has(t));
}

/** Vrai si au moins la moitié des mots significatifs de la requête se retrouvent dans les champs du résultat. */
export function ressemble(requete: string, ...champs: Array<string | undefined | null>): boolean {
  const q = tokensSignificatifs(requete);
  if (q.length === 0) return true;
  const texte = new Set(champs.filter((c): c is string => !!c).flatMap((c) => tokens(c)));
  const communs = q.filter((t) => texte.has(t)).length;
  return communs / q.length >= 0.5;
}

export function distanceKm(a: Centre, b: Centre): number {
  const r = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la1 = (a.latitude * Math.PI) / 180;
  const la2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function dansLeRayon(point: Centre, centre: Centre | null | undefined): boolean {
  if (!centre) return true;
  return distanceKm(point, centre) <= RAYON_MAX_KM;
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(minuteur);
  }
}

// ---------- Photon ----------

type FeaturePhoton = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, any>;
};

function adressePhoton(p: Record<string, any>): string | null {
  const rue = [p.housenumber, p.street].filter(Boolean).join(" ");
  const ville = [p.postcode, p.city || p.locality || p.district].filter(Boolean).join(" ");
  const parts = [rue, ville, p.country].filter((x) => x && String(x).trim());
  return parts.length ? parts.join(", ") : null;
}

async function photon(q: string, centre?: Centre | null, verifierNom = true): Promise<PointGeo | null> {
  return limitePhoton(async () => {
    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=3&lang=fr`;
    if (centre) url += `&lat=${centre.latitude}&lon=${centre.longitude}`;
    const data = await fetchJson(url);
    const features: FeaturePhoton[] = data?.features || [];
    for (const f of features) {
      const coords = f.geometry?.coordinates;
      const p = f.properties || {};
      if (!coords || coords.length < 2) continue;
      const point = { latitude: coords[1], longitude: coords[0] };
      if (!dansLeRayon(point, centre)) continue;
      if (verifierNom && !ressemble(q.split(",")[0], p.name, p.street, p.locality, p.district)) continue;
      return { ...point, address: adressePhoton(p), source: "photon" };
    }
    return null;
  });
}

// ---------- Nominatim ----------

function adresseNominatim(r: any): string | null {
  const a = r?.address || {};
  const rue = [a.house_number, a.road].filter(Boolean).join(" ");
  const ville = [a.postcode, a.city || a.town || a.village || a.municipality].filter(Boolean).join(" ");
  const parts = [rue, ville, a.country].filter((x) => x && String(x).trim());
  if (parts.length) return parts.join(", ");
  return typeof r?.display_name === "string" ? r.display_name.split(",").slice(0, 4).join(",").trim() : null;
}

async function nominatim(q: string, centre?: Centre | null): Promise<PointGeo | null> {
  return limiteNominatim(async () => {
    const attente = DELAI_NOMINATIM_MS - (Date.now() - dernierAppelNominatim);
    if (attente > 0) await new Promise((r) => setTimeout(r, attente));
    dernierAppelNominatim = Date.now();
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=3&accept-language=fr&addressdetails=1`;
    const data = await fetchJson(url);
    const resultats: any[] = Array.isArray(data) ? data : [];
    for (const r of resultats) {
      const point = { latitude: parseFloat(r.lat), longitude: parseFloat(r.lon) };
      if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) continue;
      if (!dansLeRayon(point, centre)) continue;
      return { ...point, address: adresseNominatim(r), source: "nominatim" };
    }
    return null;
  });
}

// ---------- API publique ----------

/** Centre d'une ville (pour biaiser et valider les recherches de lieux). */
export async function geocoderVille(ville: string, pays?: string | null): Promise<Centre | null> {
  const q = [ville, pays].filter(Boolean).join(", ");
  const cle = `ville:${q.toLowerCase()}`;
  if (cache.has(cle)) return (cache.get(cle) as Centre | null) ?? null;
  let r: Centre | null = await nominatim(q, null);
  if (!r) r = await photon(q, null, false);
  const centre = r ? { latitude: r.latitude, longitude: r.longitude } : null;
  cache.set(cle, centre);
  return centre;
}

export type RequeteLieu = {
  nom: string; // nom du lieu tel qu'il apparaît sur une carte
  ville: string;
  pays?: string | null;
  centre?: Centre | null; // centre de la ville, si connu
  approx?: Centre | null; // coordonnées approximatives proposées par l'IA, dernier recours
};

/** Coordonnées d'un lieu précis : Photon (rapide, vérifié par le nom) puis Nominatim, puis l'estimation IA. */
export async function geocoderLieu(req: RequeteLieu): Promise<PointGeo | null> {
  const nom = req.nom.trim();
  if (!nom) return null;
  const cle = `lieu:${nom.toLowerCase()}|${req.ville.toLowerCase()}`;
  if (cache.has(cle)) return (cache.get(cle) as PointGeo | null) ?? null;

  let r = await photon(`${nom}, ${req.ville}`, req.centre);
  if (!r) r = await nominatim([nom, req.ville, req.pays].filter(Boolean).join(", "), req.centre);
  if (!r && req.approx && Number.isFinite(req.approx.latitude) && Number.isFinite(req.approx.longitude) && dansLeRayon(req.approx, req.centre)) {
    r = { latitude: req.approx.latitude, longitude: req.approx.longitude, address: null, source: "ia" };
  }
  cache.set(cle, r);
  return r;
}

/** Lien Google Maps de recherche : ouvre la fiche du lieu, sans clé API. */
export function lienGoogleMaps(nom: string, ville?: string | null): string {
  const q = [nom, ville].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Vide le cache mémoire (tests). */
export function viderCacheGeocodage() {
  cache.clear();
}
