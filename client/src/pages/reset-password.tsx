import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background px-4">
        <Card className="max-w-md w-full p-8 space-y-6 text-center" data-testid="reset-password-card">
          <div className="space-y-2">
            <Link href="/">
              <span className="font-display font-bold text-2xl gradient-text cursor-pointer">Voyageo</span>
            </Link>
            <h1 className="font-display text-xl font-bold">Lien invalide</h1>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20" data-testid="text-error">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">Ce lien de réinitialisation est invalide ou a expiré.</p>
          </div>
          <Link href="/forgot-password">
            <Button variant="outline" className="w-full" data-testid="button-retry">
              Demander un nouveau lien
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </div>

      <Card className="max-w-md w-full p-8 space-y-6" data-testid="reset-password-card">
        <div className="text-center space-y-2">
          <Link href="/">
            <span className="font-display font-bold text-2xl gradient-text cursor-pointer" data-testid="text-logo">Voyageo</span>
          </Link>
          <h1 className="font-display text-xl font-bold" data-testid="text-title">Nouveau mot de passe</h1>
          <p className="text-sm text-muted-foreground">Choisissez votre nouveau mot de passe</p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20" data-testid="text-success">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Votre mot de passe a été mis à jour avec succès.
              </p>
            </div>
            <Button className="w-full" onClick={() => setLocation("/login")} data-testid="button-go-login">
              Se connecter
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
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
                placeholder="••••••••"
                minLength={8}
                required
                data-testid="input-confirm-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive" data-testid="text-error">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Réinitialiser mon mot de passe
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
