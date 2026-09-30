// Sécurité transverse : en-têtes HTTP, limitation de fréquence, contrôle d'accès aux voyages,
// nettoyage des URL saisies et projection publique des voyages partagés.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { db } from "./db";
import { trips, days, activities, dayTips, checklistItems, tripDocuments, expenses } from "@shared/schema";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

// ---------- En-têtes HTTP ----------

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://api.stripe.com https://api.openweathermap.org",
  "frame-src 'self' https://www.google.com https://js.stripe.com https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
].join("; ");

export function entetesSecurite(req: Request, res: Response, next: NextFunction) {
  res.removeHeader("X-Powered-By");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Content-Security-Policy", CSP);
  }
  next();
}

// ---------- Limitation de fréquence (mémoire, par instance) ----------

type Compteur = { n: number; fin: number };
const compteurs = new Map<string, Compteur>();
setInterval(() => {
  const maintenant = Date.now();
  compteurs.forEach((c, k) => { if (c.fin < maintenant) compteurs.delete(k); });
}, 10 * 60 * 1000).unref();

/** Incrémente et renvoie true si la limite est dépassée. */
export function depasse(cle: string, max: number, fenetreMs: number): boolean {
  const maintenant = Date.now();
  const c = compteurs.get(cle);
  if (!c || c.fin < maintenant) {
    compteurs.set(cle, { n: 1, fin: maintenant + fenetreMs });
    return false;
  }
  c.n++;
  return c.n > max;
}

export function ipDe(req: Request): string {
  return req.ip || req.socket.remoteAddress || "?";
}

/**
 * Middleware : `max` requêtes par `fenetreMs` par email (si `parEmail`), et `maxIp` par IP
 * (par défaut `max`, ou 4 × `max` quand on limite aussi par email, pour les réseaux partagés).
 */
export function limite(nom: string, max: number, fenetreMs: number, parEmail = false, maxIp?: number): RequestHandler {
  const plafondIp = maxIp ?? (parEmail ? max * 4 : max);
  return (req, res, next) => {
    const email = parEmail && typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
    const depasseIp = depasse(`${nom}:ip:${ipDe(req)}`, plafondIp, fenetreMs);
    const depasseEmail = email ? depasse(`${nom}:email:${email}`, max, fenetreMs) : false;
    if (depasseIp || depasseEmail) {
      res.setHeader("Retry-After", String(Math.ceil(fenetreMs / 1000)));
      return res.status(429).json({ message: "Trop de tentatives. Réessayez dans quelques minutes." });
    }
    next();
  };
}

// ---------- URL saisies : http(s) uniquement ----------

const CLE_URL = /(url|link)$/i;

function urlSure(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (s === "") return s;
  if (s.startsWith("/") && !s.startsWith("//")) return s; // chemin interne
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:" ? s : null;
  } catch {
    return null;
  }
}

function nettoyer(o: unknown, profondeur = 0): void {
  if (!o || typeof o !== "object" || profondeur > 8) return;
  if (Array.isArray(o)) { o.forEach((x) => nettoyer(x, profondeur + 1)); return; }
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
    if (CLE_URL.test(k) && typeof v === "string") (o as any)[k] = urlSure(v);
    else if (v && typeof v === "object") nettoyer(v, profondeur + 1);
  }
}

/** Neutralise les liens javascript:, data:, etc. dans tout corps JSON envoyé à l'API. */
export function nettoyerUrls(req: Request, _res: Response, next: NextFunction) {
  if (req.method !== "GET" && req.path.startsWith("/api/") && req.body && typeof req.body === "object") nettoyer(req.body);
  next();
}

// ---------- Contrôle d'accès aux voyages ----------

export type Ressource = "trip" | "day" | "activity" | "tip" | "checklist" | "document" | "expense";

async function tripIdDe(ressource: Ressource, id: number): Promise<number | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  switch (ressource) {
    case "trip": {
      const [r] = await db.select({ t: trips.id }).from(trips).where(eq(trips.id, id));
      return r?.t ?? null;
    }
    case "day": {
      const [r] = await db.select({ t: days.tripId }).from(days).where(eq(days.id, id));
      return r?.t ?? null;
    }
    case "activity": {
      const [r] = await db.select({ t: days.tripId }).from(activities).innerJoin(days, eq(activities.dayId, days.id)).where(eq(activities.id, id));
      return r?.t ?? null;
    }
    case "tip": {
      const [r] = await db.select({ t: days.tripId }).from(dayTips).innerJoin(days, eq(dayTips.dayId, days.id)).where(eq(dayTips.id, id));
      return r?.t ?? null;
    }
    case "checklist": {
      const [r] = await db.select({ t: checklistItems.tripId }).from(checklistItems).where(eq(checklistItems.id, id));
      return r?.t ?? null;
    }
    case "document": {
      const [r] = await db.select({ t: tripDocuments.tripId }).from(tripDocuments).where(eq(tripDocuments.id, id));
      return r?.t ?? null;
    }
    case "expense": {
      const [r] = await db.select({ t: expenses.tripId }).from(expenses).where(eq(expenses.id, id));
      return r?.t ?? null;
    }
  }
}

/**
 * Vérifie que l'utilisateur connecté peut agir sur le voyage auquel appartient la ressource.
 * - "gerer" : propriétaire du voyage ou super admin.
 * - "consulter" : en plus, un voyageur dont l'email figure dans assignedToEmail.
 * Répond 404 (et non 403) pour ne pas révéler l'existence des voyages des autres.
 * Pose req.adminUser, req.user.claims et req.tripId.
 */
export function accesVoyage(ressource: Ressource, param: string, niveau: "gerer" | "consulter" = "gerer"): RequestHandler {
  return async (req: any, res, next) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: "Non authentifié" });
      const [user] = await db.select().from(users).where(eq(users.id, String(userId)));
      if (!user) return res.status(401).json({ message: "Non authentifié" });
      if (!user.isActive) return res.status(403).json({ message: "Compte désactivé" });

      const tripId = await tripIdDe(ressource, Number(req.params[param]));
      if (!tripId) return res.status(404).json({ message: "Introuvable" });
      const [trip] = await db.select({ userId: trips.userId, assigned: trips.assignedToEmail }).from(trips).where(eq(trips.id, tripId));
      if (!trip) return res.status(404).json({ message: "Introuvable" });

      const proprietaire = user.role === "super_admin" || trip.userId === user.id;
      const voyageur = niveau === "consulter" && !!user.email &&
        (trip.assigned || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean).includes(user.email.toLowerCase());
      if (!proprietaire && !voyageur) return res.status(404).json({ message: "Introuvable" });

      req.adminUser = user;
      req.user = { claims: { sub: user.id, email: user.email } };
      req.tripId = tripId;
      next();
    } catch (e) {
      next(e);
    }
  };
}

/** Vérifie qu'un voyage cible (ex. déplacement d'un jour vers un autre voyage) appartient aussi à l'utilisateur. */
export async function possedeVoyage(user: { id: string; role: string | null }, tripId: number): Promise<boolean> {
  if (user.role === "super_admin") return true;
  const [t] = await db.select({ userId: trips.userId }).from(trips).where(eq(trips.id, tripId));
  return !!t && t.userId === user.id;
}

// ---------- Voyage partagé : version publique ----------

/** Retire du voyage partagé les identifiants internes et les emails des clients. */
export function versionPublique(trip: any) {
  if (!trip) return trip;
  const { userId, assignedToEmail, shareToken, ...reste } = trip;
  return {
    ...reste,
    expenses: (trip.expenses || []).map(({ userId: _u, ...e }: any) => e),
    checklistItems: (trip.checklistItems || []).map((item: any) => ({
      ...item,
      checks: (item.checks || []).map(({ userId: _u, ...c }: any) => c),
    })),
  };
}

/** Retire les secrets d'une ligne utilisateur avant de la renvoyer au navigateur. */
export function utilisateurPublic(u: any) {
  if (!u) return u;
  const { passwordHash, resetToken, resetTokenExpiresAt, ...reste } = u;
  return reste;
}
