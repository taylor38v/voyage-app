import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </div>

      <Card className="max-w-md w-full p-8 space-y-6" data-testid="login-card">
        <div className="text-center space-y-2">
          <Link href="/">
            <span className="font-display font-bold text-2xl gradient-text cursor-pointer" data-testid="text-logo">Voyageo</span>
          </Link>
          <h1 className="font-display text-xl font-bold" data-testid="text-login-title">Connexion</h1>
          <p className="text-sm text-muted-foreground">Accédez à votre espace travel planner</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <Link href="/forgot-password">
                <span className="text-xs text-primary underline cursor-pointer" data-testid="link-forgot-password">Mot de passe oublié ?</span>
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              data-testid="input-password"
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
            Se connecter
          </Button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm">
            Pas encore de compte ?{" "}
            <Link href="/register">
              <span className="text-primary underline cursor-pointer" data-testid="link-register">Créer un compte gratuitement</span>
            </Link>
          </p>
          <Link href="/pricing">
            <span className="text-sm text-muted-foreground underline cursor-pointer" data-testid="link-pricing">Voir les tarifs</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
