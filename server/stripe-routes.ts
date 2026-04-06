import type { Express } from "express";
import { stripe, PRICE_IDS, PLAN_LIMITS, type PlanKey } from "./stripe";
import { db } from "./db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import express from "express";

export function registerStripeRoutes(app: Express) {
  if (!stripe) {
    console.log("[Stripe] STRIPE_SECRET_KEY not set, Stripe routes disabled");
    return;
  }
  const stripeClient = stripe;

  app.post("/api/stripe/checkout", async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Non authentifié" });

      const { priceId } = req.body;
      if (!priceId) return res.status(400).json({ message: "priceId requis" });

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeClient.customers.create({
          email: user.email || undefined,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined,
          metadata: { userId: user.id },
        });
        customerId = customer.id;
        await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
      }

      const session = await stripeClient.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${req.headers.origin}/admin?payment=success`,
        cancel_url: `${req.headers.origin}/pricing?payment=canceled`,
        metadata: { userId: user.id },
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        locale: "fr",
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe Checkout Error]", err);
      res.status(500).json({ message: err.message || "Erreur Stripe" });
    }
  });

  app.post("/api/stripe/portal", async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Non authentifié" });
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "Aucun abonnement actif" });
      }

      const session = await stripeClient.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${req.headers.origin}/admin`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe Portal Error]", err);
      res.status(500).json({ message: err.message || "Erreur Stripe" });
    }
  });

  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = stripeClient.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      console.error("[Stripe Webhook] Signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price.id;
          const interval = subscription.items.data[0]?.price.recurring?.interval;
          const planInfo = PRICE_IDS[priceId];

          if (planInfo) {
            const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
            if (user) {
              const limits = PLAN_LIMITS[planInfo.plan];
              const periodEnd = (subscription as any).current_period_end;
              await db.update(users).set({
                stripeSubscriptionId: subscriptionId,
                plan: planInfo.plan,
                planInterval: interval || "month",
                planStatus: "active",
                maxTrips: limits.maxTrips,
                role: user.role === "super_admin" ? "super_admin" : "admin",
                planExpiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
              }).where(eq(users.id, user.id));
              console.log(`[Stripe] User ${user.id} upgraded to ${planInfo.plan}`);
            }
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          const priceId = subscription.items.data[0]?.price.id;
          const planInfo = PRICE_IDS[priceId];
          const interval = subscription.items.data[0]?.price.recurring?.interval;

          const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
          if (user && planInfo) {
            const limits = PLAN_LIMITS[planInfo.plan];
            const periodEnd = (subscription as any).current_period_end;
            await db.update(users).set({
              plan: planInfo.plan,
              planInterval: interval || user.planInterval,
              planStatus: subscription.status === "active" ? "active" : subscription.status === "past_due" ? "past_due" : "canceled",
              maxTrips: limits.maxTrips,
              planExpiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
            }).where(eq(users.id, user.id));
            console.log(`[Stripe] User ${user.id} subscription updated to ${planInfo.plan} (${subscription.status})`);
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
          if (user) {
            await db.update(users).set({
              plan: "free",
              planStatus: "canceled",
              stripeSubscriptionId: null,
              maxTrips: PLAN_LIMITS.free.maxTrips,
              planInterval: null,
            }).where(eq(users.id, user.id));
            console.log(`[Stripe] User ${user.id} subscription canceled, downgraded to free`);
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
          if (user) {
            await db.update(users).set({ planStatus: "past_due" }).where(eq(users.id, user.id));
            console.log(`[Stripe] User ${user.id} payment failed, status: past_due`);
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error("[Stripe Webhook] Processing error:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  app.get("/api/stripe/prices", (_req, res) => {
    res.json({
      solo: {
        monthly: process.env.STRIPE_PRICE_SOLO_MONTHLY || "",
        yearly: process.env.STRIPE_PRICE_SOLO_YEARLY || "",
      },
      pro: {
        monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
        yearly: process.env.STRIPE_PRICE_PRO_YEARLY || "",
      },
      agency: {
        monthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY || "",
        yearly: process.env.STRIPE_PRICE_AGENCY_YEARLY || "",
      },
    });
  });

  app.get("/api/stripe/plan", async (req: any, res) => {
    try {
      const userId = req.session?.userId || req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Non authentifié" });
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

      const plan = (user.plan || "free") as PlanKey;
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

      res.json({
        plan,
        planInterval: user.planInterval,
        planStatus: user.planStatus,
        planExpiresAt: user.planExpiresAt,
        limits,
        hasSubscription: !!user.stripeSubscriptionId,
      });
    } catch (err) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });
}
