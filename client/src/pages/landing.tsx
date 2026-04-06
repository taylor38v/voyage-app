import { Button } from "@/components/ui/button";
import { ArrowRight, Moon, Sun, Calendar, Wallet, CheckSquare, Share2, Wand2, FileText, PlusCircle, Palette, Send, Star, Instagram, Linkedin } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Link } from "wouter";
import { useEffect, useRef } from "react";

function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("animate-in"); observer.unobserve(el); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useScrollAnimation();
  return <div ref={ref} className={`opacity-0 ${className}`}>{children}</div>;
}

export default function Landing() {
  const { theme, toggleTheme } = useTheme();

  const handleLogin = () => { window.location.href = "/login"; };
  const handleRegister = () => { window.location.href = "/register"; };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const features = [
    { icon: Calendar, color: "bg-blue-500/10 text-blue-500", title: "Planning jour par jour", desc: "Créez des itinéraires détaillés avec activités, horaires, lieux et conseils pour chaque journée." },
    { icon: Wallet, color: "bg-emerald-500/10 text-emerald-500", title: "Budget transparent", desc: "Répartissez le budget par catégorie et par jour. Vos clients voient exactement où va chaque euro." },
    { icon: CheckSquare, color: "bg-violet-500/10 text-violet-500", title: "Check-list intelligente", desc: "Passeport, vaccins, valise... Vos clients suivent leur préparation étape par étape." },
    { icon: Share2, color: "bg-orange-500/10 text-orange-500", title: "Partage en 1 clic", desc: "Un simple lien pour que vos clients accèdent à leur voyage. Pas de compte requis pour eux." },
    { icon: Wand2, color: "bg-fuchsia-500/10 text-fuchsia-500", title: "Génération IA", desc: "Décrivez le voyage, l'IA génère l'itinéraire complet. Modifiez ensuite à votre guise." },
    { icon: FileText, color: "bg-cyan-500/10 text-cyan-500", title: "Documents & guide PDF", desc: "Ajoutez les billets d'avion, confirmations d'hôtel et guides PDF. Tout centralisé." },
  ];

  const steps = [
    { num: "01", icon: PlusCircle, title: "Créez le voyage", desc: "Donnez un nom, ajoutez la destination. L'IA peut générer l'itinéraire pour vous." },
    { num: "02", icon: Palette, title: "Personnalisez", desc: "Ajoutez les activités, le budget, la check-list, les documents. Tout est modifiable." },
    { num: "03", icon: Send, title: "Partagez", desc: "Envoyez le lien à votre client. Il accède à son voyage complet sur son téléphone." },
  ];

  const testimonials = [
    { quote: "Voyageo a transformé ma façon de travailler. Mes clients sont bluffés par la présentation et je gagne un temps fou sur chaque dossier.", name: "Marie L.", role: "Travel planner indépendante", initials: "ML", bg: "bg-primary/10 text-primary" },
    { quote: "Avant je passais 3h par voyage à tout mettre en forme sur Canva. Maintenant c'est 30 minutes max et le résultat est 10x plus pro.", name: "Thomas D.", role: "Fondateur de Nomad Travel", initials: "TD", bg: "bg-secondary/10 text-secondary" },
    { quote: "Le partage par lien est génial. Mes clients peuvent consulter leur voyage à tout moment, même hors-ligne. Ils adorent.", name: "Sophie R.", role: "Agence Évasion Sur-Mesure", initials: "SR", bg: "bg-accent/20 text-accent-foreground" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* SECTION 1: NAVBAR */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <span className="font-display font-bold text-2xl gradient-text cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} data-testid="text-logo">Voyageo</span>

          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollToSection("features")} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-features">Fonctionnalités</button>
            <button onClick={() => scrollToSection("how-it-works")} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-how">Comment ça marche</button>
            <Link href="/pricing"><span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="nav-pricing">Tarifs</span></Link>
            <button onClick={() => scrollToSection("testimonials")} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-faq">Témoignages</button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Link href="/pricing">
              <Button variant="outline" className="rounded-full px-4 hidden sm:inline-flex" data-testid="button-pricing-link">
                Voir les tarifs
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogin} className="rounded-full px-4" data-testid="button-login">
              Connexion
            </Button>
            <Button onClick={handleRegister} className="rounded-full px-5" data-testid="button-register">
              S'inscrire
            </Button>
          </div>
        </div>
      </nav>

      {/* SECTION 2: HERO */}
      <section className="pt-28 pb-16 lg:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6 animate-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1.5 text-sm font-medium" data-testid="badge-hero">
              <span>🚀</span> L'outil #1 des travel planners
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-[1.1]" data-testid="text-hero-title">
              Créez des voyages<br />
              <span className="gradient-text">sur-mesure</span><br />
              qui impressionnent vos clients
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed" data-testid="text-hero-subtitle">
              Voyageo est la plateforme tout-en-un pour les travel planners. Itinéraires, budgets, check-lists et partage client en un seul outil élégant.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={handleRegister} className="rounded-full px-8 text-base shadow-xl shadow-primary/20" data-testid="button-hero-cta">
                Commencer gratuitement
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="rounded-full px-8 text-base w-full sm:w-auto" data-testid="button-hero-pricing">
                  Voir les tarifs
                </Button>
              </Link>
            </div>

            <p className="text-xs text-muted-foreground" data-testid="text-hero-micro">
              Gratuit · 1 voyage inclus · Sans carte bancaire
            </p>
          </div>

          <div className="relative animate-in" style={{ animationDelay: "0.2s" }}>
            <div
              className="bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
              style={{ transform: "perspective(1000px) rotateY(-5deg) rotateX(2deg)" }}
              data-testid="mockup-app"
            >
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/30 bg-muted/30">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-3 text-xs text-muted-foreground">voyageo.app/share/abc123</span>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🌴</span>
                  <div>
                    <p className="font-display font-bold text-lg">Aventure Thaïlandaise</p>
                    <p className="text-xs text-muted-foreground">Bangkok · 10 jours · 2 voyageurs</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { emoji: "🏯", day: "Jour 1", city: "Bangkok" },
                    { emoji: "⛰️", day: "Jour 2", city: "Chiang Mai" },
                    { emoji: "🏖️", day: "Jour 3", city: "Krabi" },
                  ].map((d, i) => (
                    <div key={i} className="bg-muted/40 rounded-lg p-2.5 text-center border border-border/30">
                      <span className="text-lg">{d.emoji}</span>
                      <p className="text-[11px] font-medium mt-1">{d.day}</p>
                      <p className="text-[10px] text-muted-foreground">{d.city}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="font-medium">1 250€ / 2 500€</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" style={{ width: "50%" }} />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span>7/11 éléments préparés</span>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-3 -right-3 glass-card rounded-xl px-3 py-2 text-sm font-medium animate-float shadow-lg" data-testid="badge-floating">
              <span className="mr-1">✨</span> Partagé en 1 clic
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: SOCIAL PROOF */}
      <AnimatedSection>
        <section className="py-10 border-y border-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground" data-testid="text-social-proof">Déjà adopté par +50 travel planners en France</p>
            <div className="flex items-center justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
              <span className="ml-2 text-sm font-medium" data-testid="text-rating">4.9/5 de satisfaction</span>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* SECTION 4: FEATURES */}
      <AnimatedSection>
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold" data-testid="text-features-title">Tout ce dont un travel planner a besoin</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto" data-testid="text-features-subtitle">Un outil complet pour créer, organiser et partager des voyages exceptionnels</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-card p-6 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all"
                data-testid={`card-feature-${i}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      {/* SECTION 5: HOW IT WORKS */}
      <AnimatedSection>
        <section id="how-it-works" className="py-20 bg-card/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-display font-bold" data-testid="text-steps-title">Créez un voyage en 3 étapes</h2>
              <p className="text-muted-foreground mt-3" data-testid="text-steps-subtitle">Simple, rapide et professionnel</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-16 left-[20%] right-[20%] border-t-2 border-dashed border-border/50" />

              {steps.map((s, i) => (
                <div key={i} className="text-center relative z-10" data-testid={`step-${i}`}>
                  <div className="bg-background inline-block px-4">
                    <span className="text-5xl font-display gradient-text opacity-50">{s.num}</span>
                  </div>
                  <div className="w-14 h-14 mx-auto mt-4 mb-4 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <s.icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* SECTION 6: TESTIMONIALS */}
      <AnimatedSection>
        <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold" data-testid="text-testimonials-title">Ce que disent nos travel planners</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-card p-6 rounded-xl border border-border/50" data-testid={`card-testimonial-${i}`}>
                <span className="text-4xl text-primary/20 font-serif leading-none">"</span>
                <p className="text-sm text-foreground leading-relaxed mt-1 mb-5">{t.quote}</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${t.bg}`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      {/* SECTION 7: FINAL CTA */}
      <AnimatedSection>
        <section className="py-20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
          <div className="max-w-2xl mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-display font-bold" data-testid="text-cta-title">Prêt à impressionner vos clients ?</h2>
            <p className="text-muted-foreground" data-testid="text-cta-subtitle">Créez votre premier voyage gratuitement. Aucune carte bancaire requise.</p>
            <Button size="lg" onClick={handleRegister} className="rounded-full px-10 text-base shadow-xl shadow-primary/20" data-testid="button-cta-final">
              Commencer maintenant
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <div>
              <Link href="/pricing">
                <span className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors cursor-pointer" data-testid="link-cta-pricing">
                  Ou consultez nos tarifs →
                </span>
              </Link>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* FOOTER */}
      <footer className="border-t border-border/30 py-12 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <span className="font-display font-bold text-xl gradient-text" data-testid="text-footer-logo">Voyageo</span>
              <p className="text-sm text-muted-foreground mt-2 mb-4">L'outil des travel planners</p>
              <div className="flex gap-3">
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Instagram" data-testid="link-instagram">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="LinkedIn" data-testid="link-linkedin">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-display font-bold text-sm mb-3">Produit</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => scrollToSection("features")} className="hover:text-foreground transition-colors">Fonctionnalités</button></li>
                <li><Link href="/pricing"><span className="hover:text-foreground transition-colors cursor-pointer">Tarifs</span></Link></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-bold text-sm mb-3">Ressources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-bold text-sm mb-3">Légal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/cgv"><span className="hover:text-foreground transition-colors cursor-pointer">CGV</span></Link></li>
                <li><Link href="/confidentialite"><span className="hover:text-foreground transition-colors cursor-pointer">Politique de confidentialité</span></Link></li>
                <li><Link href="/mentions-legales"><span className="hover:text-foreground transition-colors cursor-pointer">Mentions légales</span></Link></li>
              </ul>
            </div>
          </div>

          <div className="text-center pt-6 border-t border-border/30">
            <p className="text-xs text-muted-foreground" data-testid="text-copyright">© 2025 Voyageo. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
