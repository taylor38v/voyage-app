import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { randomBytes, randomUUID } from "crypto";
import { db } from "./db";
import { trips, days, activities, dayTips, dayBudgets, checklistItems } from "@shared/schema";
import { users } from "@shared/models/auth";
import { eq, sql, and, ne, desc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { registerStripeRoutes } from "./stripe-routes";
import { PLAN_LIMITS, type PlanKey } from "./stripe";

async function checkQuota(adminUser: any, userId: string): Promise<{ allowed: boolean; message?: string }> {
  if (adminUser.role === "super_admin") return { allowed: true };

  const isInvitedAdmin = !!adminUser.createdBy;

  if (!isInvitedAdmin) {
    const planStatus = adminUser.planStatus || "active";
    if (planStatus === "canceled") {
      const plan = (adminUser.plan || "free") as PlanKey;
      if (plan !== "free") {
        return { allowed: false, message: "Votre abonnement a été annulé. Réabonnez-vous pour créer de nouveaux voyages." };
      }
    }
    if (planStatus === "past_due") {
      return { allowed: false, message: "Votre paiement est en échec. Mettez à jour votre moyen de paiement pour continuer." };
    }
  }

  const userMaxTrips = isInvitedAdmin ? (adminUser.maxTrips ?? 1) : null;
  const plan = (adminUser.plan || "free") as PlanKey;
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const effectiveMaxTrips = isInvitedAdmin ? userMaxTrips : limits.maxTrips;

  if (effectiveMaxTrips !== -1 && effectiveMaxTrips !== null) {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(trips)
      .where(and(eq(trips.userId, userId), ne(trips.status, "archived")));
    const currentCount = countResult?.count ?? 0;
    if (currentCount >= effectiveMaxTrips) {
      return {
        allowed: false,
        message: `Quota atteint (${effectiveMaxTrips} voyage(s) actif(s) maximum). ${isInvitedAdmin ? "Contactez votre administrateur pour augmenter votre quota." : "Archivez des voyages ou passez au plan supérieur."}`,
      };
    }
  }

  return { allowed: true };
}

function getPictoDescription(code: number): string {
  const descriptions: Record<number, string> = {
    1: "Ensoleillé", 2: "Peu nuageux", 3: "Partiellement nuageux",
    4: "Couvert", 5: "Brumeux", 6: "Bruine légère", 7: "Pluie légère",
    8: "Pluie", 9: "Forte pluie", 10: "Pluie verglaçante",
    11: "Neige légère", 12: "Neige", 13: "Forte neige",
    14: "Averses", 15: "Averses de neige", 16: "Orageux", 17: "Grêle",
  };
  return descriptions[code] || "Variable";
}

async function isAdmin(req: any, res: any, next: any) {
  const userId = req.session?.userId || req.user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Non authentifié" });
  }

  const [user] = await db.select().from(users).where(eq(users.id, String(userId)));
  if (!user) return res.status(403).json({ message: "Accès refusé" });
  if (!user.isActive) return res.status(403).json({ message: "Compte désactivé" });
  if (user.role !== "super_admin" && user.role !== "admin") {
    return res.status(403).json({ message: "Accès refusé" });
  }

  req.adminUser = user;
  return next();
}

async function isSuperAdmin(req: any, res: any, next: any) {
  const userId = req.session?.userId || req.user?.claims?.sub;
  if (!userId) return res.status(401).json({ message: "Non authentifié" });

  const [user] = await db.select().from(users).where(eq(users.id, String(userId)));
  if (!user) return res.status(401).json({ message: "Utilisateur introuvable" });
  if (!user.isActive) return res.status(403).json({ message: "Compte désactivé" });
  if (user.role !== "super_admin") {
    return res.status(403).json({ message: "Réservé au super administrateur" });
  }

  req.adminUser = user;
  return next();
}

const SUPER_ADMIN_EMAIL = "pavojerome@gmail.com";

async function ensureSuperAdmin() {
  try {
    const bcrypt = await import("bcryptjs");
    const allUsers = await db.select().from(users).where(eq(users.email, SUPER_ADMIN_EMAIL));
    for (const u of allUsers) {
      if (u.role !== "super_admin") {
        await db.update(users).set({ role: "super_admin", isActive: true, maxTrips: -1 }).where(eq(users.id, u.id));
        console.log(`[init] Promoted ${u.email} (id: ${u.id}) to super_admin`);
      }
      if (!u.passwordHash) {
        const hash = await bcrypt.default.hash("Voyageo2026!", 12);
        await db.update(users).set({ passwordHash: hash }).where(eq(users.id, u.id));
        console.log(`[init] Set default password for ${u.email}`);
      }
    }
  } catch (e) {
    console.log("[init] ensureSuperAdmin error:", e);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  registerObjectStorageRoutes(app);
  registerStripeRoutes(app);

  await ensureSuperAdmin();

  // === ADMIN CHECK ===

  app.get("/api/admin/check", isAuthenticated, async (req, res) => {
    const userId = (req.user as any)?.claims?.sub;
    if (!userId) return res.json({ isAdmin: false });
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const allowed = user && user.isActive && (user.role === "super_admin" || user.role === "admin");
    res.json({ isAdmin: !!allowed, role: user?.role || null });
  });

  app.get("/api/debug/auth-state", async (req: any, res) => {
    const isAuth = req.isAuthenticated ? req.isAuthenticated() : false;
    const claims = req.user?.claims || null;
    const userId = claims?.sub || null;
    let dbUser = null;
    let dbError = null;
    if (userId) {
      try {
        const userIdStr = String(userId);
        const [found] = await db.select().from(users).where(eq(users.id, userIdStr));
        if (found) {
          dbUser = { id: found.id, email: found.email, role: found.role, isActive: found.isActive };
        }
      } catch (e: any) {
        dbError = e.message;
      }
    }
    res.json({
      isAuthenticated: isAuth,
      userId: userId,
      userIdType: typeof userId,
      hasSession: !!req.session,
      sessionID: req.sessionID ? req.sessionID.substring(0, 8) + "..." : null,
      hasClaims: !!claims,
      email: claims?.email || null,
      dbUser,
      dbError,
    });
  });

  // === SUPER ADMIN ROUTES ===

  app.get("/api/super-admin/admins", isSuperAdmin, async (req, res) => {
    const allAdmins = await db.select().from(users).where(
      sql`${users.role} IN ('super_admin', 'admin')`
    );
    const adminsWithStats = await Promise.all(
      allAdmins.map(async (admin) => {
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(trips)
          .where(eq(trips.userId, admin.id));
        return { ...admin, currentTripsCount: countResult?.count ?? 0 };
      })
    );
    res.json(adminsWithStats);
  });

  app.post("/api/super-admin/admins", isSuperAdmin, async (req: any, res) => {
    const { email, displayName, maxTrips, notes } = req.body;
    if (!email || typeof email !== "string") return res.status(400).json({ message: "Email requis" });

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ message: "Format d'email invalide" });
    }

    const parsedMaxTrips = Math.max(1, Math.min(100, Math.round(Number(maxTrips) || 1)));

    const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (existing.length > 0) {
      return res.status(409).json({ message: "Un administrateur avec cet email existe déjà" });
    }

    const accessToken = randomUUID();
    const adminId = `admin_${randomUUID().slice(0, 8)}_${Date.now()}`;
    const [newAdmin] = await db.insert(users).values({
      id: adminId,
      email: cleanEmail,
      displayName: displayName ? String(displayName).slice(0, 100) : null,
      role: "admin",
      maxTrips: parsedMaxTrips,
      isActive: true,
      createdBy: req.adminUser.id,
      notes: notes ? String(notes).slice(0, 500) : null,
      accessToken,
    }).returning();

    res.status(201).json({ ...newAdmin, currentTripsCount: 0 });
  });

  app.put("/api/super-admin/admins/:id", isSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const [target] = await db.select().from(users).where(eq(users.id, id));
    if (!target) return res.status(404).json({ message: "Admin introuvable" });
    if (target.role === "super_admin") return res.status(403).json({ message: "Impossible de modifier le super admin" });

    const { displayName, maxTrips, isActive, notes, email, hasAiAccess } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (displayName !== undefined) updates.displayName = displayName ? String(displayName).slice(0, 100) : null;
    if (maxTrips !== undefined) updates.maxTrips = Math.max(1, Math.min(100, Math.round(Number(maxTrips) || 1)));
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (notes !== undefined) updates.notes = notes ? String(notes).slice(0, 500) : null;
    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (cleanEmail && cleanEmail !== target.email) {
        const [existing] = await db.select().from(users).where(and(eq(users.email, cleanEmail), ne(users.id, id)));
        if (existing) return res.status(400).json({ message: "Cet email est déjà utilisé par un autre compte" });
        updates.email = cleanEmail;
      }
    }
    if (hasAiAccess !== undefined) updates.hasAiAccess = Boolean(hasAiAccess);

    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(trips).where(eq(trips.userId, id));
    res.json({ ...updated, currentTripsCount: countResult?.count ?? 0 });
  });

  app.post("/api/super-admin/admins/:id/regenerate-token", isSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const [target] = await db.select().from(users).where(eq(users.id, id));
    if (!target) return res.status(404).json({ message: "Admin introuvable" });
    if (target.role === "super_admin") return res.status(403).json({ message: "Le super admin utilise Replit Auth" });

    const accessToken = randomUUID();
    const [updated] = await db.update(users).set({ accessToken, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    res.json(updated);
  });

  app.delete("/api/super-admin/admins/:id", isSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const [target] = await db.select().from(users).where(eq(users.id, id));
    if (!target) return res.status(404).json({ message: "Admin introuvable" });
    if (target.role === "super_admin") return res.status(403).json({ message: "Impossible de supprimer le super admin" });

    const superAdminId = (req as any).adminUser.id;
    await db.update(trips).set({ userId: superAdminId }).where(eq(trips.userId, id));

    await db.delete(users).where(eq(users.id, id));
    res.status(204).send();
  });

  // === ADMIN ROUTES ===

  app.get("/api/admin/trips", isAdmin, async (req, res) => {
    const adminUser = req.adminUser;
    if (adminUser.role === "super_admin") {
      const allTrips = await db.select().from(trips).orderBy(desc(trips.createdAt));
      return res.json(allTrips);
    }
    const ownTrips = await db.select().from(trips).where(eq(trips.userId, adminUser.id)).orderBy(desc(trips.createdAt));
    res.json(ownTrips);
  });

  app.get("/api/admin/trips/:id", isAdmin, async (req: any, res) => {
    const tripId = Number(req.params.id);
    const trip = await storage.getTrip(tripId);
    if (!trip) return res.status(404).json({ message: "Voyage introuvable" });

    if (req.adminUser.role !== "super_admin" && trip.userId !== req.adminUser.id) {
      return res.status(403).json({ message: "Accès refusé à ce voyage" });
    }
    res.json(trip);
  });

  app.post("/api/admin/trips", isAdmin, async (req: any, res) => {
    try {
      const adminUser = req.adminUser;
      const userId = adminUser.id;

      const quota = await checkQuota(adminUser, userId);
      if (!quota.allowed) {
        return res.status(403).json({ message: quota.message, upgradeUrl: "/pricing" });
      }

      const shareToken = randomBytes(16).toString("hex");
      const trip = await storage.createTrip({ ...req.body, userId, shareToken });
      res.status(201).json(trip);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put("/api/admin/trips/:id", isAdmin, async (req: any, res) => {
    try {
      const tripId = Number(req.params.id);
      const trip = await db.select().from(trips).where(eq(trips.id, tripId));
      if (!trip.length) return res.status(404).json({ message: "Voyage introuvable" });

      if (req.adminUser.role !== "super_admin" && trip[0].userId !== req.adminUser.id) {
        return res.status(403).json({ message: "Accès refusé à ce voyage" });
      }

      const body = { ...req.body };
      if (body.departureDate !== undefined) {
        body.departureDate = body.departureDate ? new Date(body.departureDate) : null;
      }
      if (body.returnDate !== undefined) {
        body.returnDate = body.returnDate ? new Date(body.returnDate) : null;
      }

      const updated = await storage.updateTrip(tripId, body);
      res.json(updated);
    } catch (err) {
      console.error("[Trip Update Error]", err);
      res.status(500).json({ message: "Erreur lors de la sauvegarde" });
    }
  });

  app.post("/api/admin/trips/:id/share-email", isAdmin, async (req: any, res) => {
    try {
      const tripId = Number(req.params.id);
      const trip = await storage.getTrip(tripId);
      if (!trip) return res.status(404).json({ message: "Voyage introuvable" });

      if (req.adminUser.role !== "super_admin" && trip.userId !== req.adminUser.id) {
        return res.status(403).json({ message: "Accès refusé" });
      }

      if (!trip.shareToken) {
        return res.status(400).json({ message: "Ce voyage n'a pas de lien de partage" });
      }

      const emails = (trip.assignedToEmail || "").split(",").map((e: string) => e.trim().toLowerCase()).filter(Boolean);
      if (emails.length === 0) {
        return res.status(400).json({ message: "Aucun email client associé à ce voyage. Ajoutez des emails dans les paramètres du voyage." });
      }

      const appUrl = process.env.APP_URL;
      let shareUrl: string;
      if (appUrl) {
        shareUrl = `${appUrl.replace(/\/$/, "")}/share/${trip.shareToken}`;
      } else {
        const host = req.headers.host || "voyageo.app";
        const protocol = req.headers["x-forwarded-proto"] || "https";
        shareUrl = `${protocol}://${host}/share/${trip.shareToken}`;
      }
      const senderName = req.adminUser.displayName || req.adminUser.firstName || "Votre travel planner";

      const { sendTripSharedEmail } = await import("./email");
      const results = await Promise.allSettled(
        emails.map((email: string) => sendTripSharedEmail(email, trip.title, shareUrl, senderName))
      );

      const sent = results.filter(r => r.status === "fulfilled" && r.value === true).length;
      const failed = results.length - sent;

      res.json({
        message: `${sent} email(s) envoyé(s) sur ${emails.length}${failed > 0 ? `, ${failed} échec(s)` : ""}`,
        sent,
        failed,
        total: emails.length,
      });
    } catch (err) {
      console.error("[Share Email Error]", err);
      res.status(500).json({ message: "Erreur lors de l'envoi des emails" });
    }
  });

  const COUNTRY_INFO: Record<string, any> = {
    "thailande": {
      emergencyLocal: "191", emergencyPolice: "191", emergencyAmbulance: "1669", emergencyFire: "199",
      embassy: "Ambassade de France, 35 Charoenkrung Soi 36, Bangkok", embassyPhone: "+66 2 657 5100",
      timezone: "Asia/Bangkok", timezoneOffset: "UTC+7 (+6h vs Paris en été, +5h en hiver)",
      localCurrency: "Baht thaïlandais", localCurrencySymbol: "฿", exchangeRate: 38,
      tippingCulture: "Pas obligatoire mais apprécié. 20-50 THB au restaurant, arrondir au supérieur pour les taxis.",
      voltage: "220V / 50Hz", plugType: "Type A, B, C (pas d'adaptateur nécessaire pour les prises françaises)",
      simWifi: "Carte SIM TrueMove H ou AIS disponible à l'aéroport (~300 THB / 8 jours). WiFi gratuit dans la plupart des hôtels et cafés."
    },
    "japon": {
      emergencyLocal: "110 (police) / 119 (ambulance)", emergencyPolice: "110", emergencyAmbulance: "119", emergencyFire: "119",
      embassy: "Ambassade de France, 4-11-44 Minami-Azabu, Minato-ku, Tokyo", embassyPhone: "+81 3 5798 6000",
      timezone: "Asia/Tokyo", timezoneOffset: "UTC+9 (+8h vs Paris en été, +7h en hiver)",
      localCurrency: "Yen japonais", localCurrencySymbol: "¥", exchangeRate: 162,
      tippingCulture: "Le pourboire n'existe PAS au Japon. Il peut même être considéré comme impoli.",
      voltage: "100V / 50-60Hz", plugType: "Type A (prises américaines plates). Adaptateur nécessaire pour les prises françaises.",
      simWifi: "Pocket WiFi recommandé (Japan Wireless, ~5000¥/semaine). SIM data chez Sakura Mobile ou à l'aéroport."
    },
    "bresil": {
      emergencyLocal: "190 (police) / 192 (SAMU)", emergencyPolice: "190", emergencyAmbulance: "192", emergencyFire: "193",
      embassy: "Ambassade de France, SES Av. das Nações, Lote 04, Quadra 801, Brasília", embassyPhone: "+55 61 3222 3999",
      timezone: "America/Sao_Paulo", timezoneOffset: "UTC-3 (-4h vs Paris en été, -3h en hiver)",
      localCurrency: "Real brésilien", localCurrencySymbol: "R$", exchangeRate: 5.5,
      tippingCulture: "10% de service souvent inclus dans l'addition. Sinon, 10% est la norme.",
      voltage: "110V ou 220V (variable selon la région)", plugType: "Type N (spécifique au Brésil, 3 broches rondes). Adaptateur nécessaire.",
      simWifi: "SIM prépayée Claro ou Vivo disponible dans les boutiques et aéroports (~R$50 pour 10 Go)."
    },
    "indonesie": {
      emergencyLocal: "112", emergencyPolice: "110", emergencyAmbulance: "118", emergencyFire: "113",
      embassy: "Ambassade de France, Jl. M.H. Thamrin No. 20, Jakarta", embassyPhone: "+62 21 2355 7600",
      timezone: "Asia/Jakarta", timezoneOffset: "UTC+7 à UTC+9 selon la région (+6h vs Paris pour Bali)",
      localCurrency: "Roupie indonésienne", localCurrencySymbol: "Rp", exchangeRate: 17000,
      tippingCulture: "5-10% au restaurant si le service n'est pas inclus. Prévoir de petits billets pour les guides et chauffeurs.",
      voltage: "220V / 50Hz", plugType: "Type C et F (prises européennes, compatible sans adaptateur)",
      simWifi: "SIM Telkomsel ou XL à l'aéroport (~100 000 Rp pour 15 Go). WiFi disponible dans les hôtels et cafés."
    },
    "mexique": {
      emergencyLocal: "911", emergencyPolice: "911", emergencyAmbulance: "911", emergencyFire: "911",
      embassy: "Ambassade de France, Campos Elíseos 339, Polanco, Mexico", embassyPhone: "+52 55 9171 9700",
      timezone: "America/Mexico_City", timezoneOffset: "UTC-6 (-7h vs Paris en été, -7h en hiver)",
      localCurrency: "Peso mexicain", localCurrencySymbol: "$MXN", exchangeRate: 19,
      tippingCulture: "10-15% au restaurant est la norme. Pourboire attendu pour les services (bagagistes, femmes de chambre).",
      voltage: "120V / 60Hz", plugType: "Type A et B (prises américaines plates). Adaptateur nécessaire.",
      simWifi: "SIM Telcel à l'aéroport ou en boutique OXXO (~200 MXN pour 5 Go). WiFi dans la plupart des hôtels."
    },
    "italie": {
      emergencyLocal: "112", emergencyPolice: "113", emergencyAmbulance: "118", emergencyFire: "115",
      embassy: "Ambassade de France, Piazza Farnese 67, Rome", embassyPhone: "+39 06 686 011",
      timezone: "Europe/Rome", timezoneOffset: "UTC+1 (même fuseau que la France)",
      localCurrency: "Euro", localCurrencySymbol: "€", exchangeRate: 1,
      tippingCulture: "Pas obligatoire. Le 'coperto' (couvert) de 1-3€ est courant. Arrondir l'addition suffit.",
      voltage: "220V / 50Hz", plugType: "Type L et C. Les prises françaises fonctionnent souvent, mais un adaptateur Type L peut être utile.",
      simWifi: "Carte UE : pas de frais de roaming. Sinon, SIM TIM ou Vodafone en boutique (~10€ pour 10 Go)."
    },
    "espagne": {
      emergencyLocal: "112", emergencyPolice: "091", emergencyAmbulance: "061", emergencyFire: "080",
      embassy: "Ambassade de France, Calle Salustiano Olózaga 9, Madrid", embassyPhone: "+34 91 423 89 00",
      timezone: "Europe/Madrid", timezoneOffset: "UTC+1 (même fuseau que la France)",
      localCurrency: "Euro", localCurrencySymbol: "€", exchangeRate: 1,
      tippingCulture: "Pas obligatoire. Laisser quelques pièces ou arrondir l'addition est apprécié.",
      voltage: "230V / 50Hz", plugType: "Type C et F (identiques à la France, pas d'adaptateur nécessaire)",
      simWifi: "Carte UE : pas de frais de roaming. Sinon, SIM Movistar ou Orange en boutique."
    },
    "etats-unis": {
      emergencyLocal: "911", emergencyPolice: "911", emergencyAmbulance: "911", emergencyFire: "911",
      embassy: "Ambassade de France, 4101 Reservoir Rd NW, Washington DC", embassyPhone: "+1 202 944 6000",
      timezone: "America/New_York (variable selon l'état)", timezoneOffset: "UTC-5 à UTC-8 (-6h à -9h vs Paris)",
      localCurrency: "Dollar américain", localCurrencySymbol: "$", exchangeRate: 1.08,
      tippingCulture: "OBLIGATOIRE : 15-20% au restaurant, bar. 1-2$ par boisson au bar. 2-5$ par nuit au femme de chambre.",
      voltage: "120V / 60Hz", plugType: "Type A et B (prises plates). Adaptateur nécessaire pour les appareils français.",
      simWifi: "SIM T-Mobile ou AT&T prépayée (~$30/mois). eSIM recommandée (Airalo, Holafly)."
    },
    "grece": {
      emergencyLocal: "112", emergencyPolice: "100", emergencyAmbulance: "166", emergencyFire: "199",
      embassy: "Ambassade de France, 7 Vassilissis Sofias, Athènes", embassyPhone: "+30 210 339 1000",
      timezone: "Europe/Athens", timezoneOffset: "UTC+2 (+1h vs Paris)",
      localCurrency: "Euro", localCurrencySymbol: "€", exchangeRate: 1,
      tippingCulture: "5-10% au restaurant est apprécié. Laisser la monnaie au taxi.",
      voltage: "220V / 50Hz", plugType: "Type C et F (identiques à la France, pas d'adaptateur nécessaire)",
      simWifi: "Carte UE : pas de frais de roaming. Sinon, SIM Cosmote ou Vodafone en boutique."
    },
    "maroc": {
      emergencyLocal: "15 (police) / 150 (pompiers)", emergencyPolice: "19", emergencyAmbulance: "15", emergencyFire: "15",
      embassy: "Ambassade de France, 1 Rue Sahnoun, Rabat", embassyPhone: "+212 537 689 700",
      timezone: "Africa/Casablanca", timezoneOffset: "UTC+1 (même fuseau que la France, pas de changement d'heure)",
      localCurrency: "Dirham marocain", localCurrencySymbol: "MAD", exchangeRate: 10.8,
      tippingCulture: "10% au restaurant. Pourboire attendu pour les guides, gardiens de parking (5-10 MAD).",
      voltage: "220V / 50Hz", plugType: "Type C et E (identiques à la France, pas d'adaptateur nécessaire)",
      simWifi: "SIM Maroc Telecom, Inwi ou Orange disponible partout (~50 MAD pour 5 Go). WiFi dans les riads et cafés."
    },
    "vietnam": {
      emergencyLocal: "113 (police) / 115 (ambulance)", emergencyPolice: "113", emergencyAmbulance: "115", emergencyFire: "114",
      embassy: "Ambassade de France, 57 Tran Hung Dao, Hanoi", embassyPhone: "+84 24 3944 5700",
      timezone: "Asia/Ho_Chi_Minh", timezoneOffset: "UTC+7 (+6h vs Paris en été, +5h en hiver)",
      localCurrency: "Dong vietnamien", localCurrencySymbol: "₫", exchangeRate: 27000,
      tippingCulture: "Pas obligatoire mais apprécié. 5-10% dans les restaurants touristiques. Arrondir pour les taxis.",
      voltage: "220V / 50Hz", plugType: "Type A, C et G (variable). Un adaptateur universel est recommandé.",
      simWifi: "SIM Viettel ou Mobifone à l'aéroport (~100 000 VND pour 30 Go). WiFi gratuit partout."
    },
    "portugal": {
      emergencyLocal: "112", emergencyPolice: "112", emergencyAmbulance: "112", emergencyFire: "112",
      embassy: "Ambassade de France, Rua Santos-o-Velho 5, Lisbonne", embassyPhone: "+351 21 393 9100",
      timezone: "Europe/Lisbon", timezoneOffset: "UTC+0 (-1h vs Paris)",
      localCurrency: "Euro", localCurrencySymbol: "€", exchangeRate: 1,
      tippingCulture: "5-10% au restaurant est apprécié mais pas obligatoire.",
      voltage: "230V / 50Hz", plugType: "Type C et F (identiques à la France, pas d'adaptateur nécessaire)",
      simWifi: "Carte UE : pas de frais de roaming. Sinon, SIM MEO ou NOS en boutique."
    }
  };

  const CITY_TO_COUNTRY: Record<string, string> = {
    "bangkok": "thailande", "phuket": "thailande", "chiang mai": "thailande", "pattaya": "thailande", "koh samui": "thailande",
    "tokyo": "japon", "osaka": "japon", "kyoto": "japon", "hiroshima": "japon", "nara": "japon",
    "rio": "bresil", "rio de janeiro": "bresil", "sao paulo": "bresil", "salvador": "bresil", "brasilia": "bresil",
    "bali": "indonesie", "jakarta": "indonesie", "ubud": "indonesie", "lombok": "indonesie", "yogyakarta": "indonesie",
    "cancun": "mexique", "mexico": "mexique", "playa del carmen": "mexique", "tulum": "mexique", "oaxaca": "mexique",
    "rome": "italie", "milan": "italie", "florence": "italie", "venise": "italie", "naples": "italie", "amalfi": "italie",
    "barcelone": "espagne", "madrid": "espagne", "seville": "espagne", "malaga": "espagne", "ibiza": "espagne", "majorque": "espagne",
    "new york": "etats-unis", "los angeles": "etats-unis", "miami": "etats-unis", "san francisco": "etats-unis", "las vegas": "etats-unis", "chicago": "etats-unis",
    "athenes": "grece", "santorin": "grece", "mykonos": "grece", "crete": "grece", "rhodes": "grece",
    "marrakech": "maroc", "casablanca": "maroc", "fes": "maroc", "rabat": "maroc", "essaouira": "maroc", "chefchaouen": "maroc",
    "hanoi": "vietnam", "ho chi minh": "vietnam", "saigon": "vietnam", "da nang": "vietnam", "hoi an": "vietnam", "ha long": "vietnam",
    "lisbonne": "portugal", "porto": "portugal", "faro": "portugal", "algarve": "portugal",
  };

  function normalizeStr(s: string): string {
    return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['']/g, "'");
  }

  function findCountryInfo(destination: string): { country: string; info: any } | null {
    const norm = normalizeStr(destination);
    for (const [key, info] of Object.entries(COUNTRY_INFO)) {
      if (norm.includes(key) || key.includes(norm)) return { country: key, info };
    }
    const parts = norm.split(/[,\-–—\s]+/).map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (CITY_TO_COUNTRY[part]) {
        const countryKey = CITY_TO_COUNTRY[part];
        return { country: countryKey, info: COUNTRY_INFO[countryKey] };
      }
    }
    for (const part of parts) {
      for (const [city, countryKey] of Object.entries(CITY_TO_COUNTRY)) {
        if (part.includes(city) || city.includes(part)) {
          return { country: countryKey, info: COUNTRY_INFO[countryKey] };
        }
      }
    }
    return null;
  }

  app.post("/api/admin/trips/:id/auto-fill-info", isAdmin, async (req: any, res) => {
    const tripId = Number(req.params.id);
    const trip = await db.select().from(trips).where(eq(trips.id, tripId));
    if (!trip.length) return res.status(404).json({ message: "Voyage introuvable" });
    if (req.adminUser.role !== "super_admin" && trip[0].userId !== req.adminUser.id) {
      return res.status(403).json({ message: "Accès refusé à ce voyage" });
    }
    const destination = req.body.destination || trip[0].destination;
    if (!destination) return res.status(400).json({ message: "Aucune destination définie" });
    const result = findCountryInfo(destination);
    if (!result) return res.status(404).json({ message: "Pays non reconnu. Remplissez les infos manuellement." });
    const updated = await storage.updateTrip(tripId, { travelInfo: result.info });
    res.json(updated);
  });

  // === TRIPS ===

  app.get(api.trips.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const email = (req.user as any).claims.email;
    const result = await storage.getTripsForUser(userId, email);
    res.json(result);
  });

  app.get(api.trips.get.path, isAuthenticated, async (req, res) => {
    const tripId = Number(req.params.id);
    const trip = await storage.getTrip(tripId);
    if (!trip) return res.status(404).json({ message: "Voyage introuvable" });

    const userId = (req.user as any).claims.sub;
    const email = (req.user as any).claims.email;
    const assignedEmails = (trip.assignedToEmail || "").split(",").map((e: string) => e.trim().toLowerCase()).filter(Boolean);
    if (trip.userId !== userId && !assignedEmails.includes(email?.toLowerCase() || "")) {
      return res.status(401).json({ message: "Accès non autorisé" });
    }
    res.json(trip);
  });

  app.get(api.trips.getByToken.path, async (req, res) => {
    const token = req.params.token;
    const trip = await storage.getTripByToken(token);
    if (!trip) return res.status(404).json({ message: "Voyage introuvable" });
    res.json(trip);
  });

  app.post(api.trips.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.trips.create.input.parse(req.body);
      const shareToken = randomBytes(16).toString("hex");
      const trip = await storage.createTrip({ ...input, userId, shareToken });
      res.status(201).json(trip);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.put(api.trips.update.path, isAuthenticated, async (req, res) => {
    const tripId = Number(req.params.id);
    const input = api.trips.update.input.parse(req.body);
    const updated = await storage.updateTrip(tripId, input);
    res.json(updated);
  });

  app.delete(api.trips.delete.path, isAuthenticated, async (req, res) => {
    const tripId = Number(req.params.id);
    await storage.deleteTrip(tripId);
    res.status(204).send();
  });

  // === DAYS ===

  app.post(api.days.create.path, isAuthenticated, async (req, res) => {
    const tripId = Number(req.params.tripId);
    const input = api.days.create.input.parse(req.body);
    const day = await storage.createDay({ ...input, tripId });
    res.status(201).json(day);
  });

  app.put(api.days.update.path, isAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const input = api.days.update.input.parse(req.body);
    const day = await storage.updateDay(id, input);
    res.json(day);
  });

  app.delete("/api/admin/days/:id", isAdmin, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteDay(id);
    res.status(204).send();
  });

  app.put("/api/admin/days/:dayId/budget", isAdmin, async (req, res) => {
    const dayId = Number(req.params.dayId);
    const { hotel, food, transport, activities, other } = req.body;
    const updates: any = {};
    if (hotel !== undefined) updates.hotel = String(hotel);
    if (food !== undefined) updates.food = String(food);
    if (transport !== undefined) updates.transport = String(transport);
    if (activities !== undefined) updates.activities = String(activities);
    if (other !== undefined) updates.other = String(other);
    const budget = await storage.updateDayBudget(dayId, updates);
    res.json(budget);
  });

  // === ACTIVITIES ===

  // Les champs numériques peuvent arriver en "" depuis les formulaires — on les neutralise avant validation
  function sanitizeActivityBody(body: any) {
    for (const k of ["latitude", "longitude", "nights", "sortOrder"]) {
      if (body && body[k] === "") body[k] = null;
    }
    return body;
  }

  app.post(api.activities.create.path, isAuthenticated, async (req, res) => {
    const dayId = Number(req.params.dayId);
    const input = api.activities.create.input.parse(sanitizeActivityBody(req.body));
    const activity = await storage.createActivity({ ...input, dayId });
    res.status(201).json(activity);
  });

  app.put(api.activities.update.path, isAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const input = api.activities.update.input.parse(sanitizeActivityBody(req.body));
    const activity = await storage.updateActivity(id, input);
    res.json(activity);
  });

  app.delete(api.activities.delete.path, isAdmin, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteActivity(id);
    res.status(204).send();
  });

  // === TIPS ===

  app.post("/api/admin/days/:dayId/tips", isAdmin, async (req, res) => {
    const dayId = Number(req.params.dayId);
    const { content, sortOrder } = req.body;
    const tip = await storage.createDayTip({ dayId, content, sortOrder: sortOrder || 0 });
    res.status(201).json(tip);
  });

  app.put("/api/admin/tips/:id", isAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Contenu requis" });
    const tip = await storage.updateDayTip(id, { content });
    res.json(tip);
  });

  app.delete("/api/admin/tips/:id", isAdmin, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteDayTip(id);
    res.status(204).send();
  });

  // === CHECKLIST ===

  app.get(api.checklist.list.path, isAuthenticated, async (req, res) => {
    const tripId = Number(req.params.tripId);
    const items = await storage.getChecklist(tripId);
    res.json(items);
  });

  app.post(api.checklist.create.path, isAuthenticated, async (req, res) => {
    const tripId = Number(req.params.tripId);
    const input = api.checklist.create.input.parse(req.body);
    const item = await storage.createChecklistItem({ ...input, tripId });
    res.status(201).json(item);
  });

  app.put("/api/admin/checklist/:id", isAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const { text, category, isCritical, phase, subcategory, hint, link } = req.body;
    const updates: any = {};
    if (text !== undefined) updates.text = text;
    if (category !== undefined) updates.category = category;
    if (isCritical !== undefined) updates.isCritical = isCritical;
    if (phase !== undefined) updates.phase = phase;
    if (subcategory !== undefined) updates.subcategory = subcategory;
    if (hint !== undefined) updates.hint = hint || null;
    if (link !== undefined) updates.link = link || null;
    const item = await storage.updateChecklistItem(id, updates);
    res.json(item);
  });

  app.post("/api/admin/trips/:tripId/checklist/bulk", isAdmin, async (req, res) => {
    const tripId = Number(req.params.tripId);
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ message: "items must be an array" });
    const created = [];
    for (const item of items) {
      const newItem = await storage.createChecklistItem({ ...item, tripId });
      created.push(newItem);
    }
    res.status(201).json(created);
  });

  app.delete("/api/admin/checklist/:id", isAdmin, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteChecklistItem(id);
    res.status(204).send();
  });

  // === DOCUMENTS ===

  app.get("/api/trips/:tripId/documents", isAuthenticated, async (req, res) => {
    const tripId = Number(req.params.tripId);
    const docs = await storage.getDocuments(tripId);
    res.json(docs);
  });

  app.post("/api/admin/trips/:tripId/documents", isAdmin, async (req, res) => {
    const tripId = Number(req.params.tripId);
    const { name, type, url, note, sortOrder } = req.body;
    if (!name || !type || !url) {
      return res.status(400).json({ message: "name, type et url sont requis" });
    }
    const doc = await storage.createDocument({ tripId, name, type, url, note: note || null, sortOrder: sortOrder ?? 0 });
    res.status(201).json(doc);
  });

  app.patch("/api/admin/documents/:id", isAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const updates = req.body;
    const doc = await storage.updateDocument(id, updates);
    res.json(doc);
  });

  app.delete("/api/admin/documents/:id", isAdmin, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteDocument(id);
    res.status(204).send();
  });

  app.post(api.checklist.check.path, isAuthenticated, async (req, res) => {
    const itemId = Number(req.params.itemId);
    const userId = (req.user as any).claims.sub;
    const { checked } = api.checklist.check.input.parse(req.body);
    const check = await storage.checkItem(itemId, userId, checked);
    res.json(check);
  });

  // === EXPENSES ===

  app.get(api.expenses.list.path, isAuthenticated, async (req, res) => {
    const tripId = Number(req.params.tripId);
    const items = await storage.getExpenses(tripId);
    res.json(items);
  });

  app.post(api.expenses.create.path, isAuthenticated, async (req, res) => {
    const tripId = Number(req.params.tripId);
    const userId = (req.user as any).claims.sub;
    const input = api.expenses.create.input.parse(req.body);
    const item = await storage.createExpense({ ...input, tripId, userId });
    res.status(201).json(item);
  });

  app.delete(api.expenses.delete.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    const expense = await storage.getExpense(id);
    if (!expense) {
      return res.status(404).json({ message: "Dépense introuvable" });
    }
    const userEmail = (req.user as any)?.claims?.email?.toLowerCase();
    const userId = (req.user as any)?.claims?.sub;
    if (expense.userId !== userId) {
      const trip = await storage.getTrip(expense.tripId);
      const tripEmails = (trip?.assignedToEmail || "").split(",").map((e: string) => e.trim().toLowerCase()).filter(Boolean);
      if (!trip || !tripEmails.includes(userEmail || "")) {
        return res.status(403).json({ message: "Accès refusé" });
      }
    }
    await storage.deleteExpense(id);
    res.status(204).send();
  });

  // === WEATHER ===

  app.get("/api/weather", async (req, res) => {
    const city = req.query.city as string;
    if (!city) return res.status(400).json({ message: "Ville requise" });

    const apiKey = process.env.METEOBLUE_API_KEY;
    if (!apiKey) {
      return res.status(501).json({ message: "Clé API météo non configurée" });
    }

    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`, {
        headers: { "User-Agent": "Voyageo/1.0" },
      });
      if (!geoRes.ok) return res.status(503).json({ message: "Service de géolocalisation indisponible" });
      const geoData = await geoRes.json();
      if (!geoData.length) return res.status(404).json({ message: "Ville introuvable" });

      const lat = parseFloat(geoData[0].lat);
      const lon = parseFloat(geoData[0].lon);
      const rawName = geoData[0].display_name?.split(",")[0] || "";
      const resolvedCity = /^[\x20-\x7E\u00C0-\u024F]+$/.test(rawName) ? rawName : city;

      const mbUrl = `https://my.meteoblue.com/packages/current?lat=${lat}&lon=${lon}&apikey=${apiKey}&format=json`;
      const mbRes = await fetch(mbUrl);
      if (!mbRes.ok) {
        const basicUrl = `https://my.meteoblue.com/packages/basic-day?lat=${lat}&lon=${lon}&apikey=${apiKey}&format=json&forecast_days=1`;
        const basicRes = await fetch(basicUrl);
        if (!basicRes.ok) return res.status(503).json({ message: "Service météo indisponible" });
        const basicData = await basicRes.json();
        const day = basicData.data_day;
        if (!day) return res.status(503).json({ message: "Données météo indisponibles" });

        const pictocode = day.pictocode?.[0] || 1;
        return res.json({
          temperature: Math.round(((day.temperature_max?.[0] || 0) + (day.temperature_min?.[0] || 0)) / 2),
          temperatureMax: Math.round(day.temperature_max?.[0] || 0),
          temperatureMin: Math.round(day.temperature_min?.[0] || 0),
          description: getPictoDescription(pictocode),
          humidity: Math.round(day.relativehumidity_mean?.[0] || 0),
          windSpeed: Math.round(day.windspeed_mean?.[0] || 0),
          icon: String(pictocode),
          city: resolvedCity,
          precipitation: Math.round((day.precipitation?.[0] || 0) * 10) / 10,
        });
      }

      const mbData = await mbRes.json();
      const current = mbData.data_current;
      if (!current) return res.status(503).json({ message: "Données météo indisponibles" });

      const pictocode = current.pictocode || 1;
      res.json({
        temperature: Math.round(current.temperature || 0),
        temperatureMax: null,
        temperatureMin: null,
        description: getPictoDescription(pictocode),
        humidity: Math.round(current.relative_humidity || 0),
        windSpeed: Math.round(current.wind_speed || 0),
        icon: String(pictocode),
        city: resolvedCity,
        precipitation: 0,
      });
    } catch {
      res.status(503).json({ message: "Service météo indisponible" });
    }
  });

  // === AI TRIP GENERATION ===

  function repairTruncatedJson(text: string): string {
    let s = text.trim();
    if (s.startsWith("```")) {
      s = s.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }
    let inString = false;
    let escape = false;
    const stack: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (escape) { escape = false; continue; }
      if (c === '\\' && inString) { escape = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c === '{' || c === '[') stack.push(c);
      if (c === '}' || c === ']') stack.pop();
    }
    if (inString) s += '"';
    let lastValid = s.length - 1;
    while (lastValid > 0 && s[lastValid] !== '}' && s[lastValid] !== ']' && s[lastValid] !== '"' && s[lastValid] !== 'e' && s[lastValid] !== 'l') {
      lastValid--;
    }
    const afterLast = s.substring(lastValid + 1).trim();
    if (afterLast.match(/^[,:]/)) {
      s = s.substring(0, lastValid + 1);
    }
    while (stack.length > 0) {
      const opener = stack.pop()!;
      s += opener === '{' ? '}' : ']';
    }
    return s;
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
    ...(process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL
      ? { baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL }
      : {}),
    timeout: 240000,
  });

  app.post("/api/admin/generate-trip", isAdmin, async (req: any, res) => {
    const { description } = req.body;
    if (!description || typeof description !== "string") {
      return res.status(400).json({ message: "Description requise" });
    }

    if (req.adminUser?.role !== "super_admin") {
      if (req.adminUser?.hasAiAccess) {
      } else {
        const isInvitedAdmin = !!req.adminUser?.createdBy;
        if (isInvitedAdmin) {
          return res.status(403).json({ message: "L'accès IA n'est pas activé pour votre compte. Contactez votre administrateur.", upgradeUrl: "/pricing" });
        } else {
          const plan = (req.adminUser?.plan || "free") as PlanKey;
          const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
          if (!limits.hasAI) {
            return res.status(403).json({ message: "La génération IA n'est pas incluse dans votre plan. Passez au plan Solo ou supérieur.", upgradeUrl: "/pricing" });
          }
        }
      }
    }

    try {
      console.log("[AI Generate] Starting generation for description:", description.slice(0, 100));
      console.log("[AI Generate] API Key exists:", !!(process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY));

      const systemPrompt = `Tu es un expert en planification de voyages. Génère un itinéraire JSON complet.

IMPORTANT: Réponds UNIQUEMENT avec du JSON valide, sans texte, sans markdown, sans backticks.

Structure JSON:
{"title":"Titre","subtitle":"Sous-titre","destination":"Pays","coverEmoji":"emoji","totalBudget":0,"currency":"€","travelers":2,"days":[{"dayNumber":1,"dateLabel":"Jour 1","city":"Ville","color":"#hex","activities":[{"time":"HH:MM","title":"Titre","icon":"camera","duration":"2h","cost":0,"type":"activity","note":"Conseil court","isPersonal":false}],"tips":["conseil"],"budget":{"hotel":0,"food":0,"transport":0,"activities":0,"other":0}}],"checklist":[{"category":"Documents","text":"Item","isCritical":true,"phase":"before","hint":"Conseil optionnel"}]}

Ic\u00f4nes valides: plane, hotel, utensils, camera, train, ship, mountain, waves, glasses, anchor, sparkles, heart, shopping-bag, droplets
Types valides: activity, food, hotel, transport, shopping, nightlife
Cat\u00e9gories checklist: Documents, Sant\u00e9, Tech, V\u00eatements, Finance, Pratique
Phases checklist: before (bien avant), week (semaine avant), pack (dans la valise)
Subcategories valise: essentiels, vetements, toilette, tech, confort

R\u00e8gles:
- 3 activit\u00e9s par jour (pas plus pour garder le JSON compact)
- Notes courtes (max 15 mots)
- Tips: 1 seul par jour
- 20% des activit\u00e9s avec isPersonal:true
- Couleurs vibrantes diff\u00e9rentes par ville
- Budget r\u00e9aliste, checklist 10-15 items r\u00e9partis dans les 3 phases
- Tout en FRAN\u00c7AIS
- Activit\u00e9s vari\u00e9es: culture, nourriture, nature, transport`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 16384,
        messages: [{ role: "user", content: description }],
        system: systemPrompt,
      });

      const content = message.content[0];
      if (content.type !== "text") {
        return res.status(500).json({ message: "Réponse IA invalide" });
      }

      let jsonText = content.text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      }

      if (message.stop_reason === "max_tokens") {
        console.warn("[AI Generate] Response truncated (max_tokens reached), attempting repair...");
        jsonText = repairTruncatedJson(jsonText);
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        console.error("[AI Generate] JSON parse error, raw:", content.text.slice(0, 500));
        if (message.stop_reason === "max_tokens") {
          return res.status(500).json({ message: "Le voyage est trop long pour être généré en une fois. Essayez avec moins de jours." });
        }
        return res.status(500).json({ message: "L'IA a généré une réponse invalide. Réessayez." });
      }

      if (!parsed.days || !Array.isArray(parsed.days) || parsed.days.length === 0) {
        return res.status(500).json({ message: "L'IA n'a pas pu générer de jours. Réessayez." });
      }

      res.json(parsed);
    } catch (err: any) {
      console.error("[AI Generate] Full error:", JSON.stringify({
        message: err.message,
        status: err.status,
        type: err.type,
        code: err.code,
        name: err.name,
      }));
      let userMsg: string;
      if (err.name === "APIConnectionTimeoutError" || err.code === "ETIMEDOUT" || err.message?.includes("timeout")) {
        userMsg = "La génération a pris trop de temps. Réessayez avec une description plus courte.";
      } else if (err.status === 429) {
        userMsg = "Trop de requêtes, attendez un moment et réessayez.";
      } else if (err.status === 401 || err.status === 403) {
        userMsg = "Erreur d'authentification avec le service IA. Vérifiez la configuration.";
      } else if (err.status === 529 || err.status === 503) {
        userMsg = "Le service IA est temporairement surchargé. Réessayez dans quelques instants.";
      } else {
        userMsg = "Erreur lors de la génération IA. Réessayez dans un moment.";
      }
      console.error("[AI Generate] User message:", userMsg);
      res.status(500).json({ message: userMsg });
    }
  });

  app.post("/api/admin/create-from-ai", isAdmin, async (req: any, res) => {
    const { tripData } = req.body;
    if (!tripData || !tripData.title || !tripData.days || !Array.isArray(tripData.days)) {
      return res.status(400).json({ message: "Données du voyage invalides (titre et jours requis)" });
    }

    try {
      const adminUser = req.adminUser;
      const userId = adminUser.id;

      const quota = await checkQuota(adminUser, userId);
      if (!quota.allowed) {
        return res.status(403).json({ message: quota.message, upgradeUrl: "/pricing" });
      }

      const shareToken = randomBytes(16).toString("hex");

      const result = await db.transaction(async (tx) => {
        const [trip] = await tx.insert(trips).values({
          userId,
          title: String(tripData.title).slice(0, 200),
          subtitle: tripData.subtitle ? String(tripData.subtitle).slice(0, 300) : null,
          destination: tripData.destination ? String(tripData.destination).slice(0, 200) : null,
          coverEmoji: tripData.coverEmoji ? String(tripData.coverEmoji).slice(0, 10) : "✈️",
          totalBudget: Math.max(0, Math.round(Number(tripData.totalBudget) || 0)),
          currency: String(tripData.currency || "€").slice(0, 5),
          travelers: Math.max(1, Math.round(Number(tripData.travelers) || 2)),
          status: "draft",
          shareToken,
        }).returning();

        for (const dayData of tripData.days) {
          if (!dayData.city || !dayData.dateLabel) continue;
          const [day] = await tx.insert(days).values({
            tripId: trip.id,
            dayNumber: Number(dayData.dayNumber) || 1,
            dateLabel: String(dayData.dateLabel).slice(0, 50),
            city: String(dayData.city).slice(0, 100),
            color: dayData.color || "#FF6B6B",
            sortOrder: Number(dayData.dayNumber) || 1,
          }).returning();

          if (dayData.activities && Array.isArray(dayData.activities)) {
            const actValues = dayData.activities
              .filter((act: any) => act.title && act.time)
              .map((act: any, idx: number) => ({
                dayId: day.id,
                time: String(act.time).slice(0, 10),
                title: String(act.title).slice(0, 200),
                icon: String(act.icon || "activity").slice(0, 30),
                duration: act.duration ? String(act.duration).slice(0, 20) : null,
                cost: String(Math.max(0, Number(act.cost) || 0)),
                type: ["activity", "food", "hotel", "transport", "shopping", "nightlife"].includes(act.type) ? act.type : "activity",
                note: act.note ? String(act.note).slice(0, 500) : null,
                isPersonal: Boolean(act.isPersonal),
                sortOrder: idx + 1,
              }));
            if (actValues.length > 0) {
              await tx.insert(activities).values(actValues);
            }
          }

          if (dayData.tips && Array.isArray(dayData.tips)) {
            const tipValues = dayData.tips
              .filter((tip: any) => typeof tip === "string" && tip.trim())
              .map((tip: string, idx: number) => ({
                dayId: day.id,
                content: String(tip).slice(0, 500),
                sortOrder: idx + 1,
              }));
            if (tipValues.length > 0) {
              await tx.insert(dayTips).values(tipValues);
            }
          }

          if (dayData.budget) {
            await tx.insert(dayBudgets).values({
              dayId: day.id,
              hotel: String(Math.max(0, Number(dayData.budget.hotel) || 0)),
              food: String(Math.max(0, Number(dayData.budget.food) || 0)),
              transport: String(Math.max(0, Number(dayData.budget.transport) || 0)),
              activities: String(Math.max(0, Number(dayData.budget.activities) || 0)),
              other: String(Math.max(0, Number(dayData.budget.other) || 0)),
            });
          }
        }

        if (tripData.checklist && Array.isArray(tripData.checklist)) {
          const checkValues = tripData.checklist
            .filter((item: any) => item.text)
            .map((item: any, idx: number) => ({
              tripId: trip.id,
              category: String(item.category || "Pratique").slice(0, 50),
              text: String(item.text).slice(0, 300),
              isCritical: Boolean(item.isCritical),
              phase: ["before", "week", "pack"].includes(item.phase) ? item.phase : "pack",
              subcategory: item.subcategory || null,
              hint: item.hint ? String(item.hint).slice(0, 120) : null,
              link: item.link || null,
              sortOrder: idx + 1,
            }));
          if (checkValues.length > 0) {
            await tx.insert(checklistItems).values(checkValues);
          }
        }

        return trip;
      });

      const fullTrip = await storage.getTrip(result.id);
      res.status(201).json(fullTrip);
    } catch (err: any) {
      console.error("[AI Create Trip]", err);
      res.status(500).json({ message: "Erreur lors de la création: " + (err.message || "inconnu") });
    }
  });

  // === SEED ===

  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existing = await db.select().from(trips);
  if (existing.length > 0) return;

  const [trip] = await db.insert(trips).values({
    title: "Thaïlande Explorer",
    subtitle: "10 jours d'aventure tropicale",
    destination: "Thaïlande",
    coverEmoji: "🌴",
    totalBudget: 1850,
    currency: "€",
    travelers: 2,
    status: "active",
    shareToken: randomBytes(16).toString("hex"),
  }).returning();

  const seedDays = [
    { tripId: trip.id, dayNumber: 1, dateLabel: "15 Mars", city: "Bangkok", color: "#FF6B6B", sortOrder: 1 },
    { tripId: trip.id, dayNumber: 2, dateLabel: "16 Mars", city: "Bangkok", color: "#FF8E53", sortOrder: 2 },
    { tripId: trip.id, dayNumber: 3, dateLabel: "17 Mars", city: "Ayutthaya", color: "#FECA57", sortOrder: 3 },
    { tripId: trip.id, dayNumber: 4, dateLabel: "18 Mars", city: "Chiang Mai", color: "#48DBFB", sortOrder: 4 },
    { tripId: trip.id, dayNumber: 5, dateLabel: "19 Mars", city: "Chiang Mai", color: "#0ABDE3", sortOrder: 5 },
    { tripId: trip.id, dayNumber: 6, dateLabel: "20 Mars", city: "Koh Phangan", color: "#00D2D3", sortOrder: 6 },
    { tripId: trip.id, dayNumber: 7, dateLabel: "21 Mars", city: "Koh Phangan", color: "#10AC84", sortOrder: 7 },
    { tripId: trip.id, dayNumber: 8, dateLabel: "22 Mars", city: "Koh Tao", color: "#2ED573", sortOrder: 8 },
    { tripId: trip.id, dayNumber: 9, dateLabel: "23 Mars", city: "Koh Tao", color: "#26DE81", sortOrder: 9 },
    { tripId: trip.id, dayNumber: 10, dateLabel: "24 Mars", city: "Krabi", color: "#A55EEA", sortOrder: 10 },
  ];
  const createdDays = await db.insert(days).values(seedDays).returning();

  const dayMap = Object.fromEntries(createdDays.map(d => [d.dayNumber, d.id]));

  const seedActivities = [
    { dayId: dayMap[1], time: "10:00", title: "Arrivée Suvarnabhumi", icon: "plane", duration: "2h", cost: "0", type: "transport", note: "Grab vers hôtel ~350 THB", sortOrder: 1 },
    { dayId: dayMap[1], time: "12:00", title: "Check-in Khaosan Palace", icon: "hotel", duration: "1h", cost: "35", type: "hotel", note: "Piscine rooftop, petit-déj inclus", sortOrder: 2 },
    { dayId: dayMap[1], time: "14:00", title: "Wat Pho — Bouddha couché", icon: "camera", duration: "2h", cost: "5", type: "activity", note: "Y aller avant 15h pour éviter la foule", latitude: 13.7465, longitude: 100.4930, sortOrder: 3 },
    { dayId: dayMap[1], time: "17:00", title: "Wat Arun au coucher du soleil", icon: "camera", duration: "1h30", cost: "3", type: "activity", note: "Le meilleur moment pour les photos", latitude: 13.7437, longitude: 100.4889, isPersonal: true, sortOrder: 4 },
    { dayId: dayMap[1], time: "19:00", title: "Street food Yaowarat (Chinatown)", icon: "utensils", duration: "2h", cost: "8", type: "food", note: "Goûter le pad thai de Thip Samai — file d'attente mais ça vaut le coup", isPersonal: true, sortOrder: 5 },

    { dayId: dayMap[2], time: "08:00", title: "Grand Palace & Wat Phra Kaew", icon: "camera", duration: "3h", cost: "15", type: "activity", note: "Dress code strict : épaules et genoux couverts", latitude: 13.7516, longitude: 100.4927, sortOrder: 1 },
    { dayId: dayMap[2], time: "12:00", title: "Déjeuner Tha Maharaj", icon: "utensils", duration: "1h", cost: "10", type: "food", note: "Food court avec vue sur le fleuve", sortOrder: 2 },
    { dayId: dayMap[2], time: "14:00", title: "Jim Thompson House", icon: "camera", duration: "2h", cost: "5", type: "activity", note: "Architecture thai traditionnelle magnifique", sortOrder: 3 },
    { dayId: dayMap[2], time: "17:00", title: "Chatuchak Weekend Market", icon: "shopping-bag", duration: "3h", cost: "25", type: "shopping", note: "15 000 stands — concentrez-vous sur les sections 2-4", isPersonal: true, sortOrder: 4 },
    { dayId: dayMap[2], time: "20:30", title: "Rooftop bar Vertigo", icon: "utensils", duration: "2h", cost: "20", type: "food", note: "Vue 360° sur Bangkok, arrivez pour le sunset", isPersonal: true, sortOrder: 5 },

    { dayId: dayMap[3], time: "07:00", title: "Train vers Ayutthaya", icon: "train", duration: "2h", cost: "1", type: "transport", note: "Billet 3ème classe = 20 THB, l'aventure locale !", sortOrder: 1 },
    { dayId: dayMap[3], time: "10:00", title: "Wat Mahathat (tête dans l'arbre)", icon: "camera", duration: "1h30", cost: "3", type: "activity", note: "LA photo iconique", latitude: 14.3566, longitude: 100.5681, sortOrder: 2 },
    { dayId: dayMap[3], time: "12:00", title: "Roti Sai Mai (street food)", icon: "utensils", duration: "45min", cost: "3", type: "food", note: "Spécialité locale : crêpe aux fils de sucre", isPersonal: true, sortOrder: 3 },
    { dayId: dayMap[3], time: "13:30", title: "Wat Chaiwatthanaram", icon: "camera", duration: "1h30", cost: "3", type: "activity", note: "Le plus photogénique, style Angkor Wat", latitude: 14.3475, longitude: 100.5536, sortOrder: 4 },

    { dayId: dayMap[4], time: "06:00", title: "Vol Bangkok → Chiang Mai", icon: "plane", duration: "1h15", cost: "40", type: "transport", note: "AirAsia, réservé 3 semaines avant", sortOrder: 1 },
    { dayId: dayMap[4], time: "09:00", title: "Check-in Old City", icon: "hotel", duration: "1h", cost: "22", type: "hotel", note: "Guest house avec jardin tropical", sortOrder: 2 },
    { dayId: dayMap[4], time: "13:00", title: "Khao Soi Khun Yai", icon: "utensils", duration: "1h", cost: "3", type: "food", note: "Le MEILLEUR khao soi de Chiang Mai", isPersonal: true, latitude: 18.7883, longitude: 98.9853, sortOrder: 3 },
    { dayId: dayMap[4], time: "15:00", title: "Cours de cuisine thai", icon: "chef-hat", duration: "4h", cost: "28", type: "activity", note: "Inclut visite du marché + 5 plats à cuisiner", sortOrder: 4 },

    { dayId: dayMap[5], time: "07:00", title: "Doi Suthep au lever du soleil", icon: "camera", duration: "3h", cost: "2", type: "activity", note: "309 marches — vue incroyable sur la ville", latitude: 18.8048, longitude: 98.9212, sortOrder: 1 },
    { dayId: dayMap[5], time: "11:00", title: "Elephant Nature Park", icon: "heart", duration: "5h", cost: "65", type: "activity", note: "Sanctuaire éthique — aucune balade à dos d'éléphant", isPersonal: true, sortOrder: 2 },
    { dayId: dayMap[5], time: "17:00", title: "Massage thai au temple", icon: "sparkles", duration: "1h", cost: "8", type: "activity", note: "200 THB pour 1h — les massages de temple sont les meilleurs", sortOrder: 3 },

    { dayId: dayMap[6], time: "07:00", title: "Vol Chiang Mai → Surat Thani", icon: "plane", duration: "1h30", cost: "45", type: "transport", note: "Puis ferry combiné vers Koh Phangan", sortOrder: 1 },
    { dayId: dayMap[6], time: "13:00", title: "Ferry vers Koh Phangan", icon: "ship", duration: "2h30", cost: "12", type: "transport", note: "Lomprayah catamaran — le plus fiable", sortOrder: 2 },
    { dayId: dayMap[6], time: "16:00", title: "Check-in Haad Salad", icon: "hotel", duration: "1h", cost: "30", type: "hotel", note: "Bungalow sur la plage, hamac inclus", sortOrder: 3 },
    { dayId: dayMap[6], time: "17:30", title: "Sunset à Zen Beach", icon: "sunset", duration: "2h", cost: "8", type: "food", note: "Cocktails les pieds dans le sable", isPersonal: true, sortOrder: 4 },

    { dayId: dayMap[7], time: "08:00", title: "Snorkeling Sail Rock", icon: "glasses", duration: "4h", cost: "35", type: "activity", note: "Le meilleur spot de plongée du Golfe", sortOrder: 1 },
    { dayId: dayMap[7], time: "15:00", title: "Cascade Phaeng", icon: "droplets", duration: "2h", cost: "1", type: "activity", note: "Baignade dans la piscine naturelle", sortOrder: 2 },
    { dayId: dayMap[7], time: "20:00", title: "BBQ seafood sur la plage", icon: "utensils", duration: "2h", cost: "12", type: "food", note: "Choisissez votre poisson au marché et faites-le griller", isPersonal: true, sortOrder: 3 },

    { dayId: dayMap[8], time: "08:00", title: "Speed boat vers Koh Tao", icon: "ship", duration: "1h", cost: "10", type: "transport", note: "Départ depuis Thong Sala", sortOrder: 1 },
    { dayId: dayMap[8], time: "11:00", title: "Plongée découverte (2 dives)", icon: "glasses", duration: "4h", cost: "55", type: "activity", note: "Koh Tao = l'endroit le moins cher au monde pour plonger", sortOrder: 2 },
    { dayId: dayMap[8], time: "16:00", title: "Viewpoint John Suwan", icon: "mountain", duration: "1h30", cost: "1", type: "activity", note: "20 min de marche, vue panoramique", isPersonal: true, sortOrder: 3 },

    { dayId: dayMap[9], time: "07:00", title: "Kayak baie de Tanote", icon: "waves", duration: "3h", cost: "8", type: "activity", note: "Location kayak 200 THB, tortues marines fréquentes", sortOrder: 1 },
    { dayId: dayMap[9], time: "11:00", title: "Snorkeling Japanese Gardens", icon: "glasses", duration: "2h", cost: "0", type: "activity", note: "Gratuit depuis la plage — apportez votre masque", sortOrder: 2 },
    { dayId: dayMap[9], time: "18:00", title: "Sunset bar Mango Viewpoint", icon: "sunset", duration: "2h", cost: "10", type: "food", note: "LE spot sunset de Koh Tao, arrivez à 17h30", isPersonal: true, sortOrder: 3 },

    { dayId: dayMap[10], time: "06:00", title: "Ferry + vol vers Krabi", icon: "plane", duration: "5h", cost: "55", type: "transport", note: "Via Surat Thani, combo ferry+vol", sortOrder: 1 },
    { dayId: dayMap[10], time: "15:00", title: "Railay Beach en longtail", icon: "anchor", duration: "3h", cost: "5", type: "activity", note: "La plus belle plage de Thaïlande — eau turquoise, falaises", isPersonal: true, latitude: 8.0119, longitude: 98.8388, sortOrder: 2 },
    { dayId: dayMap[10], time: "19:00", title: "Dîner fruits de mer Ao Nang", icon: "utensils", duration: "2h", cost: "15", type: "food", note: "Restaurants locaux face à la mer", sortOrder: 3 },
  ];

  await db.insert(activities).values(seedActivities);

  const seedTips = [
    { dayId: dayMap[1], content: "Le BTS Skytrain est le moyen le plus rapide pour se déplacer", sortOrder: 1 },
    { dayId: dayMap[1], content: "Toujours négocier les tuk-tuks AVANT de monter", sortOrder: 2 },
    { dayId: dayMap[2], content: "Le Grand Palace ferme à 15h30, arrivez à l'ouverture", sortOrder: 1 },
    { dayId: dayMap[3], content: "Crème solaire obligatoire — aucune ombre dans les ruines", sortOrder: 1 },
    { dayId: dayMap[3], content: "Apportez 2L d'eau minimum", sortOrder: 2 },
    { dayId: dayMap[4], content: "Chiang Mai est la capitale foodie — mangez partout", sortOrder: 1 },
    { dayId: dayMap[5], content: "Elephant Nature Park : réservez 1 semaine à l'avance", sortOrder: 1 },
    { dayId: dayMap[6], content: "Lomprayah > Seatran pour la ponctualité", sortOrder: 1 },
    { dayId: dayMap[7], content: "Louez un scooter pour explorer l'île (250 THB/jour)", sortOrder: 1 },
    { dayId: dayMap[8], content: "Si vous voulez l'Open Water, comptez 3 jours et ~280€", sortOrder: 1 },
    { dayId: dayMap[9], content: "Allez aux Japanese Gardens tôt le matin = eau cristalline", sortOrder: 1 },
  ];
  await db.insert(dayTips).values(seedTips);

  const seedBudgets = [
    { dayId: dayMap[1], hotel: "35", food: "22", transport: "12", activities: "8", other: "5" },
    { dayId: dayMap[2], hotel: "35", food: "35", transport: "8", activities: "45", other: "10" },
    { dayId: dayMap[3], hotel: "35", food: "15", transport: "6", activities: "6", other: "3" },
    { dayId: dayMap[4], hotel: "22", food: "20", transport: "42", activities: "44", other: "8" },
    { dayId: dayMap[5], hotel: "22", food: "18", transport: "5", activities: "75", other: "5" },
    { dayId: dayMap[6], hotel: "30", food: "18", transport: "57", activities: "0", other: "8" },
    { dayId: dayMap[7], hotel: "30", food: "25", transport: "5", activities: "44", other: "5" },
    { dayId: dayMap[8], hotel: "28", food: "22", transport: "10", activities: "56", other: "5" },
    { dayId: dayMap[9], hotel: "28", food: "35", transport: "3", activities: "8", other: "5" },
    { dayId: dayMap[10], hotel: "32", food: "25", transport: "55", activities: "5", other: "8" },
  ];
  await db.insert(dayBudgets).values(seedBudgets);

  const seedChecklist = [
    { tripId: trip.id, category: "Documents", text: "Passeport valide 6 mois apr\u00e8s le retour", isCritical: true, phase: "before", hint: "V\u00e9rifier la validit\u00e9 6 mois apr\u00e8s la date de retour", sortOrder: 1 },
    { tripId: trip.id, category: "Documents", text: "Copies num\u00e9riques des documents (cloud)", isCritical: true, phase: "before", hint: "Passeport, billets, assurance \u2014 garder une copie num\u00e9rique", sortOrder: 2 },
    { tripId: trip.id, category: "Documents", text: "Assurance voyage souscrite", isCritical: true, phase: "before", sortOrder: 3 },
    { tripId: trip.id, category: "Sant\u00e9", text: "Vaccins \u00e0 jour (h\u00e9patite A/B recommand\u00e9)", isCritical: true, phase: "before", sortOrder: 4 },
    { tripId: trip.id, category: "Finance", text: "Pr\u00e9venir sa banque", isCritical: false, phase: "before", hint: "Activer l\u2019option paiement \u00e0 l\u2019\u00e9tranger", sortOrder: 5 },
    { tripId: trip.id, category: "Tech", text: "T\u00e9l\u00e9charger les cartes offline Google Maps", isCritical: false, phase: "week", hint: "Indispensable en cas de mauvaise connexion", sortOrder: 6 },
    { tripId: trip.id, category: "Tech", text: "Acheter une eSIM ou carte SIM locale", isCritical: false, phase: "week", sortOrder: 7 },
    { tripId: trip.id, category: "Documents", text: "T\u00e9l\u00e9charger les billets / boarding pass", isCritical: false, phase: "week", sortOrder: 8 },
    { tripId: trip.id, category: "Sant\u00e9", text: "Pr\u00e9parer trousse pharmacie", isCritical: false, phase: "week", hint: "Doliprane, pansements, anti-diarrh\u00e9ique, antihistaminique", sortOrder: 9 },
    { tripId: trip.id, category: "Finance", text: "Cash THB (change \u00e0 l\u2019a\u00e9roport ou SuperRich)", isCritical: false, phase: "week", sortOrder: 10 },
    { tripId: trip.id, category: "Documents", text: "Passeport", isCritical: true, phase: "pack", subcategory: "essentiels", sortOrder: 11 },
    { tripId: trip.id, category: "Documents", text: "Billets d\u2019avion / boarding pass", isCritical: true, phase: "pack", subcategory: "essentiels", sortOrder: 12 },
    { tripId: trip.id, category: "Finance", text: "Carte bancaire sans frais \u00e0 l\u2019\u00e9tranger", isCritical: true, phase: "pack", subcategory: "essentiels", sortOrder: 13 },
    { tripId: trip.id, category: "Sant\u00e9", text: "M\u00e9dicaments personnels", isCritical: true, phase: "pack", subcategory: "essentiels", sortOrder: 14 },
    { tripId: trip.id, category: "Tech", text: "Chargeur de t\u00e9l\u00e9phone", isCritical: true, phase: "pack", subcategory: "tech", sortOrder: 15 },
    { tripId: trip.id, category: "Tech", text: "Adaptateur de prise", isCritical: false, phase: "pack", subcategory: "tech", hint: "Type A/B/C pour la Tha\u00eflande", sortOrder: 16 },
    { tripId: trip.id, category: "Tech", text: "Batterie externe", isCritical: false, phase: "pack", subcategory: "tech", sortOrder: 17 },
    { tripId: trip.id, category: "V\u00eatements", text: "V\u00eatements couvrant \u00e9paules et genoux (temples)", isCritical: true, phase: "pack", subcategory: "vetements", sortOrder: 18 },
    { tripId: trip.id, category: "V\u00eatements", text: "Chaussures de marche confortables", isCritical: false, phase: "pack", subcategory: "vetements", sortOrder: 19 },
    { tripId: trip.id, category: "Sant\u00e9", text: "Cr\u00e8me solaire SPF50", isCritical: false, phase: "pack", subcategory: "toilette", sortOrder: 20 },
    { tripId: trip.id, category: "Sant\u00e9", text: "R\u00e9pulsif anti-moustiques", isCritical: false, phase: "pack", subcategory: "toilette", sortOrder: 21 },
  ];
  await db.insert(checklistItems).values(seedChecklist);

  console.log("[seed] Thailand trip seeded with", createdDays.length, "days and activities");
}

