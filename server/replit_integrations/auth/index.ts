import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { db } from "../../db";
import { users, sessions, updateProfileSchema, changePasswordSchema } from "@shared/models/auth";
import { trips } from "@shared/schema";
import { eq, and, ne, sql, like } from "drizzle-orm";
import { randomUUID, createHash } from "crypto";
import { PLAN_LIMITS, type PlanKey } from "../../stripe";
import { sendPasswordResetEmail } from "../../email";
import { storage } from "../../storage";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function setupAuth(app: Express) {
  const sessionTtl = 30 * 24 * 60 * 60 * 1000;
  const PgStore = connectPg(session);
  const sessionStore = new PgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
    pruneSessionInterval: 6 * 60 * 60, // secondes ; le défaut (15 min) réveillait Neon en permanence une fois Render maintenu éveillé
  });

  app.set("trust proxy", 1);
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  }));
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Non authentifié" });
  }
  (req as any).user = { claims: { sub: userId } };
  (req as any).isAuthenticated = () => true;
  return next();
};

export function registerAuthRoutes(app: Express) {

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, plan } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email et mot de passe requis" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "Le mot de passe doit faire au moins 8 caractères" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Format d'email invalide" });
      }

      const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
      if (existing) {
        return res.status(409).json({ message: "Un compte existe déjà avec cet email" });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const userId = randomUUID();
      const [newUser] = await db.insert(users).values({
        id: userId,
        email: email.toLowerCase().trim(),
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: "admin",
        plan: "free",
        maxTrips: 1,
        isActive: true,
      }).returning();

      req.session.userId = newUser.id;

      import("../../email").then(({ sendWelcomeEmail }) => {
        sendWelcomeEmail(newUser.email!, newUser.firstName || undefined).catch(() => {});
      }).catch(() => {});

      res.status(201).json({
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        plan: newUser.plan,
      });
    } catch (err: any) {
      console.error("[Register Error]", err);
      res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email et mot de passe requis" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
      if (!user) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: "Compte désactivé" });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ message: "Ce compte utilise une ancienne méthode de connexion. Contactez le support." });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      req.session.userId = user.id;

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        plan: user.plan,
      });
    } catch (err: any) {
      console.error("[Login Error]", err);
      res.status(500).json({ message: "Erreur lors de la connexion" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erreur lors de la déconnexion" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Déconnecté" });
    });
  });

  app.get("/api/auth/user", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Utilisateur introuvable" });
    }

    if (!user.isActive) {
      req.session.destroy(() => {});
      return res.status(403).json({ message: "Compte désactivé" });
    }

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(trips)
      .where(eq(trips.userId, userId));

    const [activeCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(trips)
      .where(and(eq(trips.userId, userId), ne(trips.status, "archived")));

    const plan = (user.plan || "free") as PlanKey;
    const planLimits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
      displayName: user.displayName,
      maxTrips: user.maxTrips,
      isActive: user.isActive,
      plan,
      planInterval: user.planInterval,
      planStatus: user.planStatus,
      planExpiresAt: user.planExpiresAt,
      trialEndsAt: user.trialEndsAt,
      stripeSubscriptionId: user.stripeSubscriptionId,
      currentTripsCount: countResult?.count ?? 0,
      activeTripsCount: activeCount?.count ?? 0,
      planLimits,
    });
  });

  app.put("/api/auth/profile", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: "Non authentifié" });

      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Données invalides" });
      }

      const { firstName, lastName, email } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();

      const existing = await storage.getUserByEmail(normalizedEmail);
      if (existing && existing.id !== userId) {
        return res.status(409).json({ message: "Cet email est déjà utilisé par un autre compte" });
      }

      const updated = await storage.updateUserProfile(userId, { firstName, lastName, email: normalizedEmail });

      res.json({
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
      });
    } catch (err) {
      console.error("[Profile Update Error]", err);
      res.status(500).json({ message: "Erreur lors de la mise à jour du profil" });
    }
  });

  app.put("/api/auth/password", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: "Non authentifié" });

      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Données invalides" });
      }

      const { currentPassword, newPassword } = parsed.data;

      const user = await storage.getUserById(userId);
      if (!user || !user.passwordHash) return res.status(400).json({ message: "Impossible de changer le mot de passe" });

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(400).json({ message: "Mot de passe actuel incorrect" });

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await storage.updateUserPassword(userId, passwordHash);
      await storage.invalidateOtherSessions(userId, req.session?.id || '');

      res.json({ message: "Mot de passe mis à jour avec succès" });
    } catch (err) {
      console.error("[Password Change Error]", err);
      res.status(500).json({ message: "Erreur lors du changement de mot de passe" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email requis" });

      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
      if (!user) {
        return res.json({ message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." });
      }

      const rawToken = randomUUID();
      const hashedToken = createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.update(users).set({
        resetToken: hashedToken,
        resetTokenExpiresAt: expiresAt,
      }).where(eq(users.id, user.id));

      const origin = req.headers.origin || `https://${req.headers.host}`;
      const resetUrl = `${origin}/reset-password?token=${rawToken}`;

      await sendPasswordResetEmail(user.email!, resetUrl, user.firstName);

      res.json({ message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." });
    } catch (err) {
      console.error("[Forgot Password Error]", err);
      res.status(500).json({ message: "Erreur lors de l'envoi de l'email" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ message: "Token et mot de passe requis" });
      if (password.length < 8) return res.status(400).json({ message: "Le mot de passe doit faire au moins 8 caractères" });

      const hashedToken = createHash("sha256").update(token).digest("hex");
      const [user] = await db.select().from(users).where(eq(users.resetToken, hashedToken));
      if (!user) return res.status(400).json({ message: "Lien invalide ou expiré" });
      if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
        return res.status(400).json({ message: "Ce lien a expiré. Veuillez en demander un nouveau." });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      await db.update(users).set({
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      }).where(eq(users.id, user.id));

      await db.execute(sql`DELETE FROM sessions WHERE sess::text LIKE ${'%"userId":"' + user.id + '"%'}`);

      res.json({ message: "Mot de passe mis à jour avec succès" });
    } catch (err) {
      console.error("[Reset Password Error]", err);
      res.status(500).json({ message: "Erreur lors de la réinitialisation" });
    }
  });

  app.get("/auth/token/:accessToken", async (req, res) => {
    try {
      const { accessToken } = req.params;
      if (!accessToken) return res.redirect("/?error=token_missing");
      const [admin] = await db.select().from(users).where(eq(users.accessToken, accessToken));
      if (!admin) return res.redirect("/?error=token_invalid");
      if (!admin.isActive) return res.redirect("/?error=account_disabled");
      req.session.userId = admin.id;
      res.redirect("/admin");
    } catch (error) {
      console.error("[Token Auth] Error:", error);
      res.redirect("/?error=server_error");
    }
  });
}

export function getSession() {
  return (req: any, res: any, next: any) => next();
}

export { authStorage, type IAuthStorage } from "./storage";
