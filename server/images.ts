// Photos des lieux via Wikipedia / Wikimedia Commons (gratuit, sans clé, images sous licence libre).
// Une photo n'est retenue que si l'article trouvé ressemble au nom du lieu ET, quand on connaît
// les coordonnées des deux côtés, se trouve à moins de 2 km : on préfère pas de photo qu'une fausse.
import { limiteur } from "./limite";
import { distanceKm, ressemble, type Centre } from "./geocode";

const USER_AGENT = "Voyageo/1.0 (+https://voyageo-0uv7.onrender.com)";
const limite = limiteur(3);
const cache = new Map<string, string | null>();

async function chercher(langue: "fr" | "en", q: string, point?: Centre | null): Promise<string | null> {
  const url =
    `https://${langue}.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrlimit=3` +
    `&gsrsearch=${encodeURIComponent(q)}&prop=pageimages|coordinates&piprop=thumbnail&pithumbsize=800`;
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": USER_AGENT } });
    if (!r.ok) return null;
    const data: any = await r.json();
    const pages: any[] = Object.values(data?.query?.pages || {}).sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0));
    for (const p of pages) {
      const src: string | undefined = p?.thumbnail?.source;
      if (!src || /\.svg/i.test(src)) continue; // cartes, logos, drapeaux
      if (!ressemble(q.split(",")[0], p.title)) continue;
      const c = p.coordinates?.[0];
      if (point && c && distanceKm(point, { latitude: c.lat, longitude: c.lon }) > 2) continue;
      return src.split("?")[0];
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(minuteur);
  }
}

/** URL d'une photo du lieu, ou null. */
export async function imageLieu(nom: string, ville?: string | null, point?: Centre | null): Promise<string | null> {
  const cle = `${nom}|${ville || ""}`.toLowerCase();
  if (cache.has(cle)) return cache.get(cle) ?? null;
  const url = await limite(async () => (await chercher("en", nom, point)) || (await chercher("fr", nom, point)));
  if (cache.size > 2000) cache.clear();
  cache.set(cle, url);
  return url;
}

/** Types d'activités pour lesquels une photo Wikipedia a du sens (monuments, musées, plages, marchés…). */
export function typeAvecPhoto(type: string | null | undefined): boolean {
  return type === "activity" || type === "shopping" || type === "nightlife";
}
