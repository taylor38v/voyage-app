# Demande : Système Super Admin + gestion multi-administrateurs avec quotas de voyages

## Contexte

Actuellement l'app a un système d'authentification basique (Replit Auth) avec probablement un seul admin autorisé (moi). La page `/admin` retourne "Accès refusé" pour les non-admins. Il n'y a pas de système de rôles, pas de gestion multi-utilisateurs, et pas de limite sur le nombre de voyages.

Je veux transformer ça en un **système multi-admin** où :
- **Je suis le Super Admin** (le seul à pouvoir gérer les autres admins)
- **Je peux inviter d'autres administrateurs** (mes clients / partenaires) qui auront leur propre espace
- **Je contrôle le nombre de voyages** que chaque admin peut créer (quota basé sur ce qu'ils ont payé)
- Chaque admin ne voit et ne gère **que ses propres voyages**
- Le Super Admin voit **tout** (tous les admins, tous les voyages)

---

## Modification du modèle de données

### Modifier la table Users

Ajouter les champs suivants au modèle utilisateur existant :

```typescript
interface User {
  // Champs existants (garder tels quels)
  id: number;
  // ... (Replit Auth fields, username, etc.)

  // NOUVEAUX CHAMPS
  role: "super_admin" | "admin";    // Rôle de l'utilisateur
  maxTrips: number;                  // Nombre max de voyages autorisés (-1 = illimité)
  isActive: boolean;                 // Compte actif ou désactivé
  createdAt: string;                 // Date de création du compte
  createdBy?: number;                // ID du super admin qui a créé ce compte (null pour le super admin lui-même)
  displayName?: string;              // Nom affiché (optionnel, sinon username)
  email?: string;                    // Email de l'admin (pour contact)
  notes?: string;                    // Notes internes du super admin sur cet admin (ex: "Client pack 5 voyages, payé le 12/01")
}
```

### Nouveau champ pour l'authentification par token

Ajouter un champ `accessToken` au modèle User :

```typescript
accessToken?: string;   // Token unique d'accès (UUID v4), généré par le super admin. Utilisé comme lien de connexion pour les admins invités. Null pour le super admin (qui utilise Replit Auth).
```

### Migration / Setup initial

- L'utilisateur actuel (moi, connecté via Replit Auth) doit être assigné `role: "super_admin"`, `maxTrips: -1` (illimité), et `accessToken: null` (je me connecte via Replit Auth, pas via token)
- Tous les futurs admins créés par le super admin auront `role: "admin"` par défaut et un `accessToken` auto-généré (UUID v4)
- Le `role: "super_admin"` ne peut JAMAIS être attribué via l'interface — il est hardcodé pour un seul utilisateur (identifié par son ID Replit ou son username). C'est une sécurité critique.

### Modification de la table Trips

Ajouter/vérifier que chaque trip a un champ `userId` (ou `ownerId`) qui référence l'admin qui l'a créé. C'est probablement déjà le cas, mais s'assurer que :
- Quand un admin crée un voyage, `userId` = son propre ID
- Un admin ne peut voir/modifier/supprimer que les voyages où `userId` = son ID
- Le super admin peut voir TOUS les voyages de TOUS les admins

## Système d'authentification double

### Super Admin (moi) — Replit Auth

Rien ne change. Je me connecte via Replit Auth comme actuellement (`/api/login`). Le serveur reconnaît mon username/ID Replit et m'assigne le rôle `super_admin`.

### Admins invités — Lien unique avec token

Chaque admin reçoit un **lien de connexion secret** généré par le super admin. Le flux :

1. Le super admin crée un admin dans le panel → un `accessToken` (UUID v4) est auto-généré
2. Le super admin copie le lien de connexion : `https://{domain}/auth/token/{accessToken}`
3. Le super admin envoie ce lien à son client (par email, WhatsApp, etc. — en dehors de l'app)
4. L'admin clique sur le lien → le serveur vérifie le token, crée une session (cookie), et redirige vers le dashboard
5. L'admin est connecté. Tant que son cookie de session est valide, il n'a pas besoin de recliquer le lien.

### Endpoint de connexion par token

```
GET /auth/token/:accessToken
```

Comportement :
1. Chercher l'utilisateur avec ce `accessToken` dans la base
2. Si aucun utilisateur trouvé → page d'erreur : "Lien invalide ou expiré"
3. Si l'utilisateur est `isActive: false` → page d'erreur : "Compte désactivé — Contactez l'administrateur"
4. Si OK → créer une session pour cet utilisateur (même mécanisme de session/cookie que Replit Auth) et rediriger vers `/`
5. Le token reste valide indéfiniment (pas d'expiration) — le super admin peut le régénérer manuellement s'il suspecte une fuite

### Régénération de token

Le super admin peut **régénérer le token** d'un admin à tout moment depuis le panel (bouton "Nouveau lien"). Cela :
- Génère un nouveau UUID v4 pour `accessToken`
- Invalide l'ancien lien (il ne fonctionnera plus)
- NE déconnecte PAS les sessions existantes de l'admin (il reste connecté s'il a déjà une session active)
- Le super admin doit renvoyer le nouveau lien à l'admin

### Session et déconnexion

- La session admin fonctionne exactement comme la session Replit Auth actuelle (cookie httpOnly)
- Durée de session : longue (30 jours ou plus) pour éviter que l'admin doive redemander le lien
- L'admin peut se déconnecter via le bouton existant → il devra recliquer son lien pour se reconnecter

---

### Règles d'accès

**Super Admin (`role: "super_admin"`)** :
- Peut créer des voyages (illimité)
- Peut voir/modifier/supprimer TOUS les voyages de tous les admins
- Peut accéder au panel de gestion des admins
- Peut créer/modifier/désactiver/supprimer des comptes admin
- Peut modifier le quota `maxTrips` de chaque admin
- Peut voir les stats globales (nombre total de voyages, admins actifs, etc.)

**Admin (`role: "admin"`)** :
- Peut créer des voyages **tant que son quota n'est pas atteint** (`nombre de trips existants < maxTrips`)
- Ne peut voir/modifier/supprimer que SES propres voyages
- Ne peut PAS accéder au panel de gestion des admins
- Ne peut PAS voir les voyages des autres admins
- Voit un indicateur de son quota sur son dashboard (ex: "3/5 voyages utilisés")

### Vérification du quota à la création de voyage

Quand un admin (role: "admin") essaie de créer un nouveau voyage :

1. Compter le nombre de voyages existants de cet admin
2. Comparer avec son `maxTrips`
3. Si `maxTrips === -1` → pas de limite, autoriser
4. Si `nombre de voyages >= maxTrips` → refuser avec erreur 403 et message "Vous avez atteint votre limite de voyages ({maxTrips}). Contactez l'administrateur pour augmenter votre quota."

### Modification des endpoints API existants

**`GET /api/trips`** (dashboard utilisateur) :
- Si super_admin → retourner TOUS les trips (avec info sur le owner de chaque trip)
- Si admin → retourner uniquement les trips de cet admin (filtre `userId = currentUser.id`)

**`GET /api/admin/trips`** (page admin) :
- Si super_admin → retourner TOUS les trips de tous les admins (avec nom de l'admin pour chaque trip)
- Si admin → retourner uniquement ses propres trips

**`POST /api/trips`** (création de voyage) :
- Vérifier le quota avant de créer
- Assigner `userId = currentUser.id`

**`PATCH/DELETE /api/trips/:id`** :
- Si super_admin → autorisé sur tous les trips
- Si admin → autorisé uniquement si `trip.userId === currentUser.id`

### Nouveaux endpoints API

```
GET    /api/super-admin/admins              → Liste tous les admins (super_admin only)
POST   /api/super-admin/admins              → Crée un nouveau compte admin (super_admin only)
PATCH  /api/super-admin/admins/:adminId     → Modifie un admin (quota, isActive, notes, etc.)
DELETE /api/super-admin/admins/:adminId     → Supprime un admin et optionnellement ses voyages
GET    /api/super-admin/stats               → Stats globales (nombre d'admins, trips total, etc.)
```

Tous ces endpoints retournent 403 si l'utilisateur n'est pas `super_admin`.

---

## Vue Super Admin — Panel de gestion des admins

### Accès

Ajouter un **bouton/lien visible uniquement pour le super_admin** dans le Layout/header de l'app (ou sur le dashboard), qui mène vers une page `/super-admin` ou une section dédiée dans la page `/admin`.

**Option recommandée** : Ajouter un onglet/tab "Gestion des admins" visible UNIQUEMENT pour le super_admin dans la page `/admin` existante. Les admins normaux ne voient pas ce tab.

### Design du panel de gestion des admins

**Header de la section** :
- Titre : "Gestion des administrateurs"
- Sous-titre : "{X} administrateur(s) actif(s)"
- Bouton : "Ajouter un administrateur" (icône `UserPlus`)
- Compteur stats rapides : Total voyages créés par tous les admins, nombre d'admins actifs/inactifs

**Liste des admins** (dans une Card ou Table) :

Chaque admin est affiché dans une Card avec :

```
┌──────────────────────────────────────────────┐
│ 👤 Nom de l'admin                    [Actif] │
│    email@example.com                         │
│                                              │
│ 📊 Voyages : 3 / 5    ████████░░ 60%        │
│                                              │
│ 📝 "Client pack 5 voyages, payé le 12/01"   │
│                                              │
│ [🔗 Copier le lien] [Modifier] [Désactiver]  │
└──────────────────────────────────────────────┘
```

Éléments de la card :
- **Avatar/Icône** : icône `User` dans un cercle coloré (ou initiales du nom)
- **Nom** : `displayName` — `text-sm font-bold`
- **Email** : `text-xs text-muted-foreground` (si renseigné)
- **Badge statut** : "Actif" (vert) ou "Désactivé" (rouge/gris) basé sur `isActive`
- **Barre de quota** : Composant `Progress` montrant `tripsCount / maxTrips`. Si `maxTrips === -1`, afficher "Illimité" sans barre.
- **Texte quota** : "{tripsCount} / {maxTrips} voyages" — texte en rouge si quota atteint (100%)
- **Notes** : `notes` en italique, `text-xs text-muted-foreground`, tronqué si trop long
- **Date de création** : "Créé le {date}" en `text-[10px]`
- **Boutons d'action** :
  - "🔗 Copier le lien" → copie le lien de connexion `https://{domain}/auth/token/{accessToken}` dans le presse-papier + feedback "Lien copié !"
  - "Modifier" → ouvre le formulaire d'édition (Dialog)
  - "Désactiver"/"Activer" → toggle `isActive` (avec confirmation)
  - "Supprimer" → supprime l'admin (avec double confirmation + option de supprimer ou transférer ses voyages)

### Formulaire d'ajout d'un admin (Dialog/Modal)

Champs :
1. **Nom affiché** (obligatoire) — Input text, placeholder: "Nom, entreprise ou pseudo"
2. **Email** (optionnel) — Input text, placeholder: "email@example.com (pour vos notes)"
3. **Nombre de voyages autorisés** (obligatoire) — Input number, min: 1
   - Toggle/checkbox "Illimité" qui, si coché, set `maxTrips = -1` et désactive l'input number
   - Par défaut : 1
4. **Notes internes** (optionnel) — Textarea, placeholder: "Notes privées (visibles uniquement par vous)"

**Pas de champ username/password/email de connexion.** Le token d'accès est généré automatiquement à la création.

Boutons : "Annuler" + "Créer l'administrateur"

**Après la création** : afficher immédiatement un dialogue/modal de confirmation avec le **lien de connexion** :

```
┌──────────────────────────────────────────────┐
│ ✅ Administrateur créé !                     │
│                                              │
│ Envoyez ce lien à [Nom] pour qu'il           │
│ puisse se connecter :                        │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ https://monapp.replit.dev/auth/token/... │ │
│ └──────────────────────────────────────────┘ │
│                  [📋 Copier le lien]         │
│                                              │
│ ⚠️ Ce lien est confidentiel. Quiconque le   │
│ possède peut accéder au compte.              │
│                                              │
│                              [Fermer]        │
└──────────────────────────────────────────────┘
```

- Le lien est dans un champ `input readonly` avec fond `bg-muted` et police `font-mono text-xs`
- Bouton "Copier le lien" → `navigator.clipboard.writeText(url)` + feedback "Copié !"
- Avertissement de confidentialité en `text-xs text-amber-500`

### Formulaire de modification d'un admin (Dialog/Modal)

Mêmes champs que l'ajout. Champs supplémentaires :
- **Statut** : Toggle actif/inactif
- **Résumé** : Afficher "Cet admin a actuellement X voyage(s)" en lecture seule
- **Lien de connexion** : Affiché en lecture seule (champ `input readonly font-mono text-xs`) avec deux boutons :
  - "📋 Copier" → copie le lien
  - "🔄 Régénérer" → génère un nouveau token (avec confirmation "L'ancien lien ne fonctionnera plus. Continuer ?")

Boutons : "Annuler" + "Enregistrer"

### Dialogue de suppression d'un admin

Quand le super admin clique "Supprimer" sur un admin qui a des voyages existants :

```
⚠️ Supprimer cet administrateur ?

[Nom de l'admin] a actuellement X voyage(s).

Que souhaitez-vous faire avec ses voyages ?

○ Transférer les voyages vers mon compte (super admin)
○ Supprimer tous ses voyages définitivement

[Annuler]  [Confirmer la suppression]
```

---

## Vue Admin (normal) — Modifications du dashboard

### Indicateur de quota sur le dashboard

Pour les admins avec `role: "admin"`, afficher un **bandeau de quota** en haut du dashboard :

```
┌──────────────────────────────────────────┐
│ 📊 Vos voyages : 3 / 5                  │
│ ████████████████░░░░░░░░░ 60%            │
└──────────────────────────────────────────┘
```

- Card discrète avec la barre de progression `Progress`
- Texte : "{count} / {maxTrips} voyages utilisés"
- Si `maxTrips === -1` → ne pas afficher cette card (illimité)
- Si le quota est atteint (100%) → card en rouge/destructive avec le message "Limite atteinte — contactez l'administrateur"

### Blocage de la création de voyage

Si le quota est atteint :
- Le bouton "Nouveau voyage" / "Créer un voyage" est **désactivé** (grisé, `disabled`)
- Au hover/clic sur le bouton désactivé, afficher un tooltip : "Vous avez atteint votre limite de {maxTrips} voyage(s). Contactez l'administrateur."
- Sur la page `/admin` si applicable, même logique de blocage

### Masquer les éléments super_admin

- L'admin normal ne voit PAS le tab/section "Gestion des admins"
- L'admin normal ne voit PAS les voyages des autres admins
- L'admin normal ne voit PAS les stats globales

---

## Endpoint `/api/auth/user` — Enrichir la réponse

L'endpoint qui retourne l'utilisateur courant doit maintenant inclure :

```json
{
  "id": 1,
  "username": "hugro",
  "role": "super_admin",
  "maxTrips": -1,
  "isActive": true,
  "displayName": "Hugro",
  "currentTripsCount": 12
}
```

Le champ `currentTripsCount` est calculé dynamiquement (COUNT des trips de cet user). Ça permet au frontend de :
- Afficher le quota sans requête supplémentaire
- Vérifier côté client si le bouton "Créer" doit être désactivé (même si la vraie vérification est côté serveur)

---

## Sécurité — Points critiques

1. **Le rôle `super_admin` est attribué une seule fois** lors du setup initial (migration), à l'utilisateur actuel identifié par son ID/username Replit. Il n'est JAMAIS possible de créer un autre super_admin via l'interface ou l'API.

2. **Les tokens d'accès (`accessToken`) sont des UUID v4** — suffisamment longs et aléatoires pour ne pas être devinables. Ils ne doivent JAMAIS apparaître dans les logs serveur ni dans les URLs de l'API (sauf le endpoint de connexion `/auth/token/:token`).

3. **Un admin désactivé (`isActive: false`)** :
   - Ne peut plus se connecter via son lien (le endpoint `/auth/token/:token` refuse)
   - Si une session existe déjà, le middleware d'auth doit vérifier `isActive` à chaque requête et rejeter si `false` → l'admin est redirigé vers une page "Compte désactivé — Contactez l'administrateur"
   - Ses voyages existants restent accessibles en lecture via les liens de partage client (les clients ne doivent pas être impactés)

4. **La vérification du quota est TOUJOURS faite côté serveur** (dans le POST /api/trips). Le blocage côté client (bouton désactivé) est un confort UX, pas une sécurité.

5. **Isolation des données** : un admin ne peut JAMAIS accéder aux voyages d'un autre admin, même en bidouillant l'URL. Chaque requête API vérifie `trip.userId === currentUser.id` (sauf pour le super_admin).

6. **Le super admin peut régénérer le token** d'un admin à tout moment. L'ancien lien cesse de fonctionner pour les nouvelles connexions, mais les sessions existantes ne sont pas invalidées (pour ne pas couper un admin en plein travail).

---

## Résumé des fichiers à modifier

1. **Schema/DB** : Ajouter les champs `role`, `maxTrips`, `isActive`, `createdAt`, `createdBy`, `displayName`, `email`, `notes`, `accessToken` à la table users
2. **Migration** : Assigner `role: "super_admin"`, `maxTrips: -1`, `accessToken: null` à l'utilisateur actuel (identifié par son ID/username Replit)
3. **Nouveau endpoint auth** : Créer `GET /auth/token/:accessToken` qui vérifie le token, crée une session cookie, et redirige vers `/`
4. **API Auth** : Enrichir `/api/auth/user` avec `role`, `maxTrips`, `currentTripsCount`
5. **API Auth middleware** : Vérifier `isActive` à chaque requête authentifiée — bloquer si `false`
6. **API Trips** : Modifier GET/POST/PATCH/DELETE pour respecter les permissions par rôle + vérifier le quota au POST
7. **API Super Admin** : Créer les endpoints CRUD `/api/super-admin/admins` (inclure un endpoint pour régénérer le token)
8. **Frontend — `admin.tsx`** : Ajouter le tab "Gestion des admins" visible uniquement pour `super_admin`, avec la liste des admins, le formulaire d'ajout/édition, le lien de connexion copiable, et les boutons d'action
9. **Frontend — `dashboard.tsx`** : Ajouter la card de quota pour les admins normaux + désactiver le bouton création si quota atteint
10. **Frontend — `use-auth.ts`** : Exposer `role`, `maxTrips`, `currentTripsCount` dans le hook
11. **Frontend — `App.tsx` ou `layout.tsx`** : Afficher/masquer les liens de navigation selon le rôle

---

## Contraintes techniques

- **Super admin** : se connecte via Replit Auth (comme actuellement, rien ne change)
- **Admins invités** : se connectent via un lien unique contenant un token (`/auth/token/:uuid`). Pas besoin de compte Replit, pas de mot de passe, pas d'email de connexion. Le super admin leur envoie le lien par le canal de son choix.
- Le endpoint `/auth/token/:token` crée une session (cookie httpOnly, durée 30 jours minimum) et redirige vers `/`
- Si un utilisateur non-enregistré essaie d'accéder à `/admin` ou `/` sans session → afficher la page de login Replit Auth (pour le super admin) ou une page "Accès non autorisé"
- Les liens de partage client (`/share/:token`) restent publics et ne sont pas impactés par la désactivation d'un compte admin
- Dark mode compatible
- Mobile-friendly (le panel super admin est principalement desktop mais doit rester utilisable sur mobile)
