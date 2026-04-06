import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </div>

      <Card className="max-w-md w-full p-8 space-y-6" data-testid="forgot-password-card">
        <div className="text-center space-y-2">
          <Link href="/">
            <span className="font-display font-bold text-2xl gradient-text cursor-pointer" data-testid="text-logo">Voyageo</span>
          </Link>
          <h1 className="font-display text-xl font-bold" data-testid="text-title">Mot de passe oublié</h1>
          <p className="text-sm text-muted-foreground">
            Entrez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20" data-testid="text-success">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Si un compte existe avec cet email, vous recevrez un lien de réinitialisation dans quelques instants.
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Vérifiez également votre dossier spam.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full" data-testid="button-back-login">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la connexion
              </Button>
            </Link>
          </div>
        ) : (
          <>
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

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive" data-testid="text-error">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Envoyer le lien
              </Button>
            </form>

            <div className="text-center">
              <Link href="/login">
                <span className="text-sm text-muted-foreground underline cursor-pointer" data-testid="link-login">
                  Retour à la connexion
                </span>
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
