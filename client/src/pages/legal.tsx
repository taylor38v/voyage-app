import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
        <div className="text-center mb-8">
          <Link href="/">
            <span className="font-display font-bold text-2xl gradient-text cursor-pointer" data-testid="text-logo">Voyageo</span>
          </Link>
        </div>
        <h1 className="font-display text-3xl font-bold mb-8 text-center" data-testid="text-legal-title">{title}</h1>
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground" data-testid="legal-content">
          {children}
        </div>
        <div className="mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          <div className="flex justify-center gap-6 flex-wrap">
            <Link href="/cgv"><span className="hover:text-foreground cursor-pointer">CGV</span></Link>
            <Link href="/mentions-legales"><span className="hover:text-foreground cursor-pointer">Mentions légales</span></Link>
            <Link href="/confidentialite"><span className="hover:text-foreground cursor-pointer">Confidentialité</span></Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CGV() {
  return (
    <LegalLayout title="Conditions Générales de Vente">
      <section>
        <h2 className="text-lg font-semibold text-foreground">Article 1 — Objet</h2>
        <p>Les présentes Conditions Générales de Vente (CGV) régissent l'utilisation de la plateforme Voyageo (ci-après « le Service »), éditée par Jérôme Pavo (ci-après « l'Éditeur »).</p>
        <p>Le Service propose aux professionnels du voyage (travel planners, agents de voyage, organisateurs) un outil de création et de partage d'itinéraires personnalisés à destination de leurs clients.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Article 2 — Offres et tarification</h2>
        <p>Le Service est proposé sous forme d'abonnement mensuel ou annuel, selon les plans suivants :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Gratuit</strong> : 1 voyage actif, fonctionnalités de base</li>
          <li><strong>Solo</strong> : jusqu'à 5 voyages, génération IA, toutes fonctionnalités</li>
          <li><strong>Pro</strong> : jusqu'à 15 voyages, multi-administrateur (3 max)</li>
          <li><strong>Agence</strong> : voyages illimités, administrateurs illimités, marque blanche</li>
        </ul>
        <p>Les prix sont affichés TTC sur la page de tarification. L'Éditeur se réserve le droit de modifier les tarifs à tout moment, les abonnements en cours restant au tarif souscrit jusqu'à leur renouvellement.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Article 3 — Inscription et compte</h2>
        <p>L'utilisation du Service nécessite la création d'un compte avec une adresse email valide et un mot de passe. L'utilisateur est responsable de la confidentialité de ses identifiants.</p>
        <p>Chaque compte est personnel et ne peut être cédé ou partagé. L'Éditeur se réserve le droit de suspendre tout compte en cas d'utilisation frauduleuse.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Article 4 — Paiement</h2>
        <p>Le paiement s'effectue par carte bancaire via la plateforme sécurisée Stripe. L'abonnement est renouvelé automatiquement à chaque échéance (mensuelle ou annuelle).</p>
        <p>En cas d'échec de paiement, l'accès aux fonctionnalités payantes sera suspendu jusqu'à régularisation.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Article 5 — Résiliation</h2>
        <p>L'utilisateur peut résilier son abonnement à tout moment depuis son espace de gestion Stripe. La résiliation prend effet à la fin de la période en cours, sans remboursement au prorata.</p>
        <p>Les données de l'utilisateur restent accessibles pendant 30 jours après la résiliation, après quoi elles pourront être supprimées.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Article 6 — Droit de rétractation</h2>
        <p>Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne s'applique pas aux services pleinement exécutés avant la fin du délai de rétractation, ce dont l'utilisateur est informé lors de la souscription.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Article 7 — Responsabilité</h2>
        <p>L'Éditeur s'engage à fournir le Service avec diligence. Toutefois, le Service est fourni « en l'état » sans garantie de disponibilité continue. L'Éditeur ne saurait être tenu responsable des dommages indirects liés à l'utilisation du Service.</p>
        <p>Les contenus créés par les utilisateurs (itinéraires, textes, images) sont de leur entière responsabilité.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Article 8 — Propriété intellectuelle</h2>
        <p>Le Service, son design, son code source et ses contenus originaux sont la propriété exclusive de l'Éditeur. Les utilisateurs conservent la propriété de leurs contenus uploadés sur la plateforme.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Article 9 — Droit applicable</h2>
        <p>Les présentes CGV sont soumises au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable avant toute action judiciaire. À défaut, les tribunaux compétents seront ceux du ressort du siège de l'Éditeur.</p>
      </section>

      <p className="text-xs text-muted-foreground/70 mt-8">Dernière mise à jour : février 2026</p>
    </LegalLayout>
  );
}

export function MentionsLegales() {
  return (
    <LegalLayout title="Mentions Légales">
      <section>
        <h2 className="text-lg font-semibold text-foreground">Éditeur du site</h2>
        <p>Voyageo est édité par Jérôme Pavo, entrepreneur individuel.</p>
        <ul className="list-none space-y-1">
          <li><strong>Email</strong> : pavojerome@gmail.com</li>
          <li><strong>Responsable de la publication</strong> : Jérôme Pavo</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Hébergement</h2>
        <p>Le site est hébergé par :</p>
        <ul className="list-none space-y-1">
          <li><strong>Render Services, Inc.</strong></li>
          <li>525 Brannan St, Suite 300, San Francisco, CA 94107, USA</li>
          <li>Site web : <a href="https://render.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">render.com</a></li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Prestataires techniques</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Paiement</strong> : Stripe, Inc. (traitement des paiements sécurisés)</li>
          <li><strong>Base de données</strong> : Neon (PostgreSQL hébergé)</li>
          <li><strong>Emails transactionnels</strong> : Resend</li>
          <li><strong>Intelligence artificielle</strong> : Anthropic (génération d'itinéraires)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Propriété intellectuelle</h2>
        <p>L'ensemble du contenu du site (textes, graphismes, logos, images, code source) est protégé par le droit de la propriété intellectuelle. Toute reproduction, même partielle, est interdite sans autorisation préalable de l'Éditeur.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Données personnelles</h2>
        <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles. Pour exercer ces droits, contactez-nous à pavojerome@gmail.com.</p>
        <p>Pour plus d'informations, consultez notre <Link href="/confidentialite"><span className="text-primary hover:underline cursor-pointer">politique de confidentialité</span></Link>.</p>
      </section>

      <p className="text-xs text-muted-foreground/70 mt-8">Dernière mise à jour : février 2026</p>
    </LegalLayout>
  );
}

export function PolitiqueConfidentialite() {
  return (
    <LegalLayout title="Politique de Confidentialité">
      <section>
        <h2 className="text-lg font-semibold text-foreground">1. Responsable du traitement</h2>
        <p>Le responsable du traitement des données personnelles est Jérôme Pavo, joignable à l'adresse pavojerome@gmail.com.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">2. Données collectées</h2>
        <p>Nous collectons les données suivantes :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Données d'identification</strong> : nom, prénom, adresse email</li>
          <li><strong>Données de connexion</strong> : mot de passe (hashé avec bcrypt), adresse IP, cookies de session</li>
          <li><strong>Données de paiement</strong> : traitées exclusivement par Stripe (nous ne stockons aucun numéro de carte)</li>
          <li><strong>Données d'utilisation</strong> : voyages créés, itinéraires, documents uploadés</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">3. Finalités du traitement</h2>
        <p>Vos données sont traitées pour les finalités suivantes :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Gestion de votre compte utilisateur et authentification</li>
          <li>Fourniture du Service (création et partage d'itinéraires)</li>
          <li>Gestion des abonnements et de la facturation</li>
          <li>Envoi d'emails transactionnels (bienvenue, partage de voyage, réinitialisation de mot de passe)</li>
          <li>Amélioration du Service et support technique</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">4. Base juridique</h2>
        <p>Le traitement de vos données repose sur :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>L'exécution du contrat (fourniture du Service)</li>
          <li>Votre consentement (emails de communication)</li>
          <li>L'intérêt légitime (amélioration du Service, sécurité)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">5. Destinataires des données</h2>
        <p>Vos données peuvent être transmises aux prestataires suivants, dans le cadre strict de la fourniture du Service :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Stripe</strong> : gestion des paiements (conforme PCI DSS)</li>
          <li><strong>Resend</strong> : envoi d'emails transactionnels</li>
          <li><strong>Anthropic</strong> : génération IA d'itinéraires (les descriptions de voyages sont envoyées pour traitement, pas les données personnelles)</li>
          <li><strong>Replit / Neon</strong> : hébergement et base de données</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">6. Durée de conservation</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Données de compte : conservées pendant la durée de l'abonnement + 30 jours après résiliation</li>
          <li>Données de facturation : conservées 10 ans (obligation légale)</li>
          <li>Cookies de session : durée de la session (30 jours maximum)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">7. Vos droits</h2>
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
          <li><strong>Droit de rectification</strong> : corriger vos données inexactes</li>
          <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données</li>
          <li><strong>Droit à la portabilité</strong> : récupérer vos données dans un format structuré</li>
          <li><strong>Droit d'opposition</strong> : vous opposer au traitement de vos données</li>
        </ul>
        <p>Pour exercer ces droits, contactez-nous à pavojerome@gmail.com. Nous répondrons dans un délai de 30 jours.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">8. Cookies</h2>
        <p>Le site utilise uniquement des cookies strictement nécessaires au fonctionnement du Service :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Cookie de session</strong> : maintien de votre connexion (connect.sid)</li>
          <li><strong>Préférence de thème</strong> : stockée en localStorage (clair/sombre)</li>
        </ul>
        <p>Aucun cookie de tracking, publicitaire ou analytique n'est utilisé.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">9. Sécurité</h2>
        <p>Nous mettons en œuvre les mesures suivantes pour protéger vos données :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Chiffrement des mots de passe (bcrypt, 12 rounds)</li>
          <li>Connexions HTTPS exclusivement</li>
          <li>Tokens de réinitialisation hachés (SHA-256) avec expiration</li>
          <li>Sessions sécurisées avec invalidation après changement de mot de passe</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
        <p>Pour toute question relative à la protection de vos données, vous pouvez nous contacter à l'adresse pavojerome@gmail.com.</p>
        <p>Vous pouvez également introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) : <a href="https://www.cnil.fr" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>.</p>
      </section>

      <p className="text-xs text-muted-foreground/70 mt-8">Dernière mise à jour : février 2026</p>
    </LegalLayout>
  );
}
