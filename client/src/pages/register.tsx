import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

const PLAN_DETAILS: Record<string, { name: string; price: string; color: string }> = {
  solo: { name: "Solo", price: "19€/mois", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  pro: { name: "Pro", price: "49€/mois", color: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30" },
  agency: { name: "Agence", price: "99€/mois", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
};

export default function Register() {
  const selectedPlan = new URLSearchParams(window.location.search).get("plan") || "free";
  const interval = new URLSearchParams(window.location.search).get("interval") || "monthly";
  const planDetail = PLAN_DETAILS[selectedPlan];

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (!acceptTerms) {
      setError("Veuillez accepter les conditions d'utilisation");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firstName: firstName || undefined, lastName: lastName || undefined, plan: selectedPlan }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      if (selectedPlan !== "free") {
        try {
          const pricesRes = await fetch("/api/stripe/prices");
          if (!pricesRes.ok) throw new Error("Impossible de charger les tarifs");
          const prices = await pricesRes.json();
          const priceId = prices?.[selectedPlan]?.[interval === "monthly" ? "monthly" : "yearly"];

          if (!priceId) throw new Error("Tarif introuvable pour ce plan");

          const checkoutRes = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priceId }),
            credentials: "include",
          });
          const checkoutData = await checkoutRes.json();
          if (checkoutData.url) {
            window.location.href = checkoutData.url;
            return;
          }
          throw new Error("Erreur lors de la redirection vers le paiement");
        } catch (checkoutErr: any) {
          setError(checkoutErr.message || "Erreur lors du paiement. Vous pouvez souscrire depuis votre espace.");
          setLocation("/admin");
          return;
        }
      }

      setLocation("/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4 py-12">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </div>

      <Card className="max-w-md w-full p-8 space-y-6" data-testid="register-card">
        <div className="text-center space-y-2">
          <Link href="/">
            <span className="font-display font-bold text-2xl gradient-text cursor-pointer" data-testid="text-logo">Voyageo</span>
          </Link>
          <h1 className="font-display text-xl font-bold" data-testid="text-register-title">Créer votre compte</h1>
          {planDetail && (
            <Badge className={`text-xs ${planDetail.color}`} data-testid="badge-plan">
              Plan {planDetail.name} — {planDetail.price}
            </Badge>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Jean"
                data-testid="input-firstname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Dupont"
                data-testid="input-lastname"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
              required
              minLength={8}
              data-testid="input-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirmez votre mot de passe"
              required
              data-testid="input-confirm-password"
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={acceptTerms}
              onCheckedChange={(v) => setAcceptTerms(v === true)}
              data-testid="checkbox-terms"
            />
            <Label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
              J'accepte les{" "}
              <a href="#" className="text-primary underline">conditions d'utilisation</a>
            </Label>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive" data-testid="text-error">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {selectedPlan !== "free" ? "Créer mon compte et payer" : "Créer mon compte gratuit"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm">
            Déjà un compte ?{" "}
            <Link href="/login">
              <span className="text-primary underline cursor-pointer" data-testid="link-login">Se connecter</span>
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
