// Marque du travel planner : nom d'agence, logo, couleur et coordonnées, affichés sur le carnet PDF
// et la page voyageur des voyages qu'il a créés. Le plan Agence (et le super admin) retire la mention Voyageo.

export type Marque = {
  nomAgence: string;
  logo: string; // data URL (png, jpeg, webp) redimensionnée côté navigateur, ou URL https
  couleur: string; // #RRGGBB
  email: string;
  telephone: string;
  siteWeb: string;
  whatsapp: string;
  signature: string; // phrase d'accroche ou mentions en pied de carnet
};

export type MarquePublique = Partial<Marque> & { nom: string; marqueBlanche: boolean };

const TAILLE_MAX_LOGO = 300_000; // caractères de data URL (≈ 220 Ko d'image)

function texte(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "";
}

function urlHttps(v: unknown): string {
  const s = texte(v, 300);
  if (!s) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

function logoValide(v: unknown): string {
  if (typeof v !== "string" || !v) return "";
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= TAILLE_MAX_LOGO) return v;
  if (/^https:\/\//.test(v) && v.length <= 500) return v;
  return "";
}

/** Valide et normalise la saisie ; lève une erreur lisible si le logo est refusé. */
export function nettoyerMarque(entree: any): Marque {
  const logoBrut = entree?.logo;
  const logo = logoValide(logoBrut);
  if (logoBrut && !logo) {
    throw Object.assign(new Error("Logo refusé : PNG, JPEG ou WebP de moins de 200 Ko, ou lien https."), { status: 400 });
  }
  const couleur = texte(entree?.couleur, 7);
  return {
    nomAgence: texte(entree?.nomAgence, 80),
    logo,
    couleur: /^#[0-9a-fA-F]{6}$/.test(couleur) ? couleur.toLowerCase() : "",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texte(entree?.email, 120)) ? texte(entree?.email, 120).toLowerCase() : "",
    telephone: texte(entree?.telephone, 30).replace(/[^\d+().\s-]/g, ""),
    siteWeb: urlHttps(entree?.siteWeb),
    whatsapp: texte(entree?.whatsapp, 30).replace(/[^\d+]/g, ""),
    signature: texte(entree?.signature, 200),
  };
}

/** Ce que voit le voyageur : la marque du planner, avec un nom de repli. */
export function marquePublique(u: any): MarquePublique | null {
  if (!u) return null;
  const m = (u.branding || {}) as Partial<Marque>;
  const nomPerso = [u.firstName, u.lastName].filter(Boolean).join(" ");
  const nom = m.nomAgence || u.displayName || nomPerso || "";
  const marqueBlanche = u.role === "super_admin" || u.plan === "agency";
  return {
    nom,
    nomAgence: m.nomAgence || "",
    logo: m.logo || "",
    couleur: m.couleur || "",
    email: m.email || "",
    telephone: m.telephone || "",
    siteWeb: m.siteWeb || "",
    whatsapp: m.whatsapp || "",
    signature: m.signature || "",
    marqueBlanche,
  };
}
