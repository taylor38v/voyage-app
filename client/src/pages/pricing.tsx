import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { Check, Moon, Sun, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const DISPLAY_PRICES = {
  solo: { monthly: 19, yearly: 190 },
  pro: { monthly: 49, yearly: 490 },
  agency: { monthly: 99, yearly: 990 },
};

const FAQ_ITEMS = [
  {
    q: "Puis-je changer de plan à tout moment ?",
    a: "Oui, vous pouvez upgrader ou downgrader à tout moment. Le changement prend effet immédiatement.",
  },
  {
    q: "Qu'est-ce qu'un voyage actif ?",
    a: "Un voyage au statut 'brouillon' ou 'actif'. Les voyages archivés ne comptent pas dans votre quota.",
  },
  {
    q: "Comment fonctionne le paiement ?",
    a: "Le paiement est sécurisé via Stripe. Vous pouvez payer par carte bancaire. Les factures sont disponibles dans votre espace client.",
  },
  {
    q: "Puis-je annuler mon abonnement ?",
    a: "Oui, à tout moment depuis votre espace de gestion. Vous conservez l'accès jusqu'à la fin de la période payée.",
  },
  {
    q: "Le white-label, c'est quoi ?",
    a: "Avec le plan Agence, vos clients voient votre marque (logo, nom, couleurs) au lieu de Voyageo. Parfait pour les agences.",
  },
];

export default function Pricing() {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [stripePrices, setStripePrices] = useState<Record<string, Record<string, string>> | null>(null);

  useEffect(() => {
    fetch("/api/stripe/prices").then(r => r.json()).then(setStripePrices).catch(() => {});
  }, []);

  const handleCTA = async (planKey: "solo" | "pro" | "agency") => {
    if (isLoading) return;
    if (!user) {
      window.location.href = `/register?plan=${planKey}&interval=${interval}`;
      return;
    }

    const priceId = stripePrices?.[planKey]?.[interval === "monthly" ? "monthly" : "yearly"];
    if (!priceId) {
      toast({ title: "Configuration manquante", description: "Ce plan n'est pas encore disponible.", variant: "destructive" });
      return;
    }

    setLoadingPlan(planKey);
    try {
      const res = await apiRequest("POST", "/api/stripe/checkout", { priceId });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Erreur", description: data.message || "Impossible de créer la session de paiement", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Impossible de lancer le paiement", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      key: "solo" as const,
      name: "Solo",
      description: "Pour les travel planners indépendants qui démarrent",
      featured: false,
      features: [
        "Jusqu'à 5 voyages actifs",
        "1 compte administrateur",
        "Génération IA des itinéraires",
        "Partage client par lien",
        "Check-list & budget",
        "Support par email",
      ],
    },
    {
      key: "pro" as const,
      name: "Pro",
      description: "Pour les travel planners établis avec du volume",
      featured: true,
      features: [
        "Jusqu'à 15 voyages actifs",
        "3 comptes administrateurs",
        "Tout ce que Solo inclut",
        "Documents & guide PDF",
        "Google My Maps intégré",
        "Support prioritaire",
      ],
    },
    {
      key: "agency" as const,
      name: "Agence",
      description: "Pour les agences de voyage sur-mesure",
      featured: false,
      features: [
        "Voyages illimités",
        "Admins illimités",
        "White-label (votre marque)",
        "Toutes les fonctionnalités Pro",
        "Onboarding personnalisé",
        "Support dédié",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="pricing-page">
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/">
            <span className="font-display font-bold text-2xl gradient-text cursor-pointer" data-testid="text-logo">Voyageo</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            {user ? (
              <Link href="/admin">
                <Button variant="outline" className="rounded-full px-6" data-testid="button-dashboard">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Button onClick={() => window.location.href = "/login"} className="rounded-full px-6" data-testid="button-login">
                Connexion
              </Button>
            )}
          </div>
        </div>
      </nav>

      <section className="pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4" data-testid="text-pricing-title">
          Des prix simples et transparents
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8" data-testid="text-pricing-subtitle">
          Choisissez le plan adapté à votre activité de travel planner
        </p>

        <div className="inline-flex items-center gap-3 bg-muted/50 rounded-full p-1 mb-12" data-testid="interval-toggle">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${interval === "monthly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            data-testid="button-monthly"
          >
            Mensuel
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${interval === "yearly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            data-testid="button-yearly"
          >
            Annuel
            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
              2 mois offerts
            </Badge>
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {plans.map((plan) => {
            const price = DISPLAY_PRICES[plan.key][interval];
            const isYearly = interval === "yearly";
            const monthlyEquiv = isYearly ? Math.round(price / 12) : price;

            return (
              <Card
                key={plan.key}
                className={`relative text-left transition-all ${plan.featured ? "border-primary shadow-xl scale-[1.02] md:scale-105" : "hover:shadow-lg"}`}
                data-testid={`card-plan-${plan.key}`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 px-4 py-1" data-testid="badge-popular">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Le plus populaire
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <h3 className="text-xl font-display font-bold text-foreground" data-testid={`text-plan-name-${plan.key}`}>
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div data-testid={`text-plan-price-${plan.key}`}>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground">{monthlyEquiv}€</span>
                      <span className="text-muted-foreground">/mois</span>
                    </div>
                    {isYearly && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Facturé {price}€/an
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleCTA(plan.key)}
                    disabled={loadingPlan === plan.key || isLoading}
                    variant={plan.featured ? "default" : "outline"}
                    className={`w-full ${plan.featured ? "bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20" : ""}`}
                    data-testid={`button-cta-${plan.key}`}
                  >
                    {loadingPlan === plan.key ? "Redirection..." : `Commencer avec ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto text-center">
        <div className="glass-card rounded-2xl p-8" data-testid="card-free-plan">
          <h2 className="text-2xl font-display font-bold text-foreground mb-3">
            Gratuit pour commencer
          </h2>
          <p className="text-muted-foreground mb-6">
            Testez Voyageo gratuitement avec 1 voyage actif. Aucune carte bancaire requise.
          </p>
          <Button
            onClick={() => window.location.href = "/register"}
            size="lg"
            className="rounded-full px-8"
            data-testid="button-free-signup"
          >
            Créer mon compte gratuit
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto" data-testid="faq-section">
        <h2 className="text-2xl font-display font-bold text-foreground text-center mb-8">
          Questions fréquentes
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-foreground" data-testid={`faq-trigger-${i}`}>
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground" data-testid={`faq-content-${i}`}>
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <footer className="py-8 px-4 border-t border-border/30 text-center">
        <p className="text-sm text-muted-foreground" data-testid="text-footer">
          © {new Date().getFullYear()} Voyageo. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
