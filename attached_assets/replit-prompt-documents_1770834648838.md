# Demande : Ajout d'une section "Documents de voyage" (Coffre-fort)

## Contexte

L'app dispose de 6 onglets dans la BottomNav côté client : Accueil, Carte, Jours, Budget, Check, Infos. On ne veut PAS ajouter un 7ème onglet (trop pour un bottom nav mobile). 

Le champ `trip.guideUrl` existe déjà et est dédié exclusivement au **carnet de voyage PDF** (affiché sur l'Accueil avec l'icône Download et le texte "Télécharger le guide PDF"). Il ne doit PAS être modifié ni réutilisé pour cette feature.

On veut ajouter un **système de documents de voyage** (coffre-fort) qui permet à l'admin d'ajouter des liens vers des documents importants (billets d'avion, confirmations d'hôtel, assurance, copie de passeport, etc.) et au client de les retrouver facilement.

---

## Nouveau modèle de données

### Nouvelle entité `TripDocument`

Créer une table/collection `trip_documents` liée au trip :

```typescript
interface TripDocument {
  id: number;
  tripId: number;
  name: string;                    // Ex: "Billet aller Paris → Bangkok"
  type: TripDocumentType;          // Catégorie du document
  url: string;                     // URL vers le document (Google Drive, Dropbox, lien direct, etc.)
  note?: string;                   // Note optionnelle (ex: "Référence : ABC123", "Check-in à partir de 14h")
  sortOrder: number;               // Pour ordonner les documents dans chaque catégorie
  createdAt: string;
}

type TripDocumentType = 
  | "flight"        // Billets d'avion / boarding pass
  | "hotel"         // Confirmations d'hébergement
  | "transport"     // Trains, bus, transferts, location de voiture
  | "insurance"     // Assurance voyage
  | "identity"      // Passeport, visa, copie de pièce d'identité
  | "activity"      // Réservations d'activités, billets de musée, etc.
  | "other";        // Autre document
```

### Ajouter au trip model

Ajouter un champ `documents` au trip qui retourne la liste des `TripDocument[]` associés au trip. L'API de récupération du trip par token (`/api/trips/share/:token`) doit inclure ce champ.

---

## Vue Client — Affichage des documents

### 1. Card de raccourci sur l'onglet Accueil (`ClientAccueil`)

Ajouter une card **après** la card du guide PDF (guideUrl) et **avant** la card des villes. Cette card s'affiche uniquement si `trip.documents.length > 0`.

Design de la card :
```
┌──────────────────────────────────────┐
│  📁  Documents de voyage             │
│  [icon]  X documents disponibles     │
│       Billets, confirmations, etc. → │
└──────────────────────────────────────┘
```

- Icône à gauche : div 40x40 rounded-md avec bg `violet-500/10` et icône `FolderOpen` (lucide-react) en `violet-500`
- Titre : "Documents de voyage" (text-sm font-medium)
- Sous-titre : "{count} document{s} disponible{s}" (text-xs text-muted-foreground)
- Flèche `ChevronRight` à droite
- Au clic : `setTab("infos")` → switch vers l'onglet Infos qui contient la section documents complète
- Classe : `hover-elevate cursor-pointer` (comme la card du guide)
- data-testid: `card-documents-shortcut`

### 2. Section complète dans l'onglet Infos (`ClientInfosPratiques`)

Ajouter une section **"Documents de voyage"** en HAUT de l'onglet Infos (avant les infos pratiques existantes). Elle s'affiche uniquement si `trip.documents.length > 0`.

#### Structure de la section

Les documents sont groupés par `type` et affichés dans des sous-sections.

**Ordre des catégories** (toujours dans cet ordre, n'afficher que celles qui ont des documents) :
1. `identity` → "Identité & Visa" — Icône: `Shield` — Couleur accent: `red-500`
2. `flight` → "Vols" — Icône: `Plane` — Couleur accent: `blue-500`
3. `hotel` → "Hébergements" — Icône: `Hotel` — Couleur accent: `amber-500`
4. `transport` → "Transports" — Icône: `Navigation` — Couleur accent: `cyan-500`
5. `insurance` → "Assurance" — Icône: `Shield` — Couleur accent: `emerald-500`
6. `activity` → "Activités & Réservations" — Icône: `Sparkles` — Couleur accent: `purple-500`
7. `other` → "Autres documents" — Icône: `FileText` — Couleur accent: `gray-500`

#### Design d'un document item

Chaque document est une Card cliquable qui ouvre l'URL dans un nouvel onglet :

```
┌──────────────────────────────────────┐
│ [icône type]  Billet aller CDG→BKK   │
│               Réf: ABC123XYZ     🔗  │
└──────────────────────────────────────┘
```

- Card avec `p-3`, `border-border/40`, `hover-elevate cursor-pointer`
- À gauche : icône du type dans un cercle coloré (w-9 h-9 rounded-md flex items-center justify-center, bg-{couleur}/10, icône en {couleur})
- Au centre :
  - Nom du document : `text-sm font-medium` (une ligne, truncate si trop long)
  - Note si elle existe : `text-xs text-muted-foreground` (une ligne, truncate)
- À droite : icône `ExternalLink` (w-4 h-4 text-muted-foreground)
- Au clic : `window.open(document.url, '_blank')`
- data-testid: `doc-item-{document.id}`

#### Header de la section

```
┌──────────────────────────────────────┐
│ 📂 Documents de voyage               │
│ Vos documents importants à portée    │
│ de main                              │
└──────────────────────────────────────┘
```

- Même style que les headers des autres sections de l'onglet Infos
- Icône `FolderOpen` dans un cercle `violet-500/10`
- Titre : "Documents de voyage" (text-lg font-display font-bold)
- Sous-titre : "Vos documents importants à portée de main" (text-xs text-muted-foreground)

#### Séparateur visuel

Ajouter un séparateur visuel (hr ou div avec border-t border-border/30 et my-6) entre la section Documents et les infos pratiques existantes, pour bien distinguer les deux zones.

---

## Vue Admin — Gestion des documents (`trip-details.tsx`)

### Nouvel onglet/section dans le panel admin

Ajouter un tab **"Documents"** dans les TabsTrigger du trip-details (à côté de Planning, Budget, Checklist, etc.). Icône : `FolderOpen`.

### Contenu du tab Documents admin

**Header** :
- Titre "Documents de voyage"
- Bouton "Ajouter un document" (icône `Plus`)
- Compteur : "{count} document{s}"

**Liste des documents existants** :
Afficher les documents groupés par type, chaque document avec :
- Icône du type + nom + note
- Bouton "Modifier" (icône `Pencil`, ouvre le formulaire en mode édition)
- Bouton "Supprimer" (icône `Trash2`, avec confirmation)
- Drag handle pour réordonner (optionnel, si pas trop complexe — sinon skip)

**Formulaire d'ajout/édition** (Dialog/Modal) :

Champs du formulaire :
1. **Nom du document** (obligatoire) — Input text, placeholder: "Ex: Billet aller Paris → Bangkok"
2. **Type** (obligatoire) — Select dropdown :
   - "Identité & Visa" (value: `identity`)
   - "Vols" (value: `flight`)
   - "Hébergements" (value: `hotel`)
   - "Transports" (value: `transport`)
   - "Assurance" (value: `insurance`)
   - "Activités & Réservations" (value: `activity`)
   - "Autre" (value: `other`)
3. **URL du document** (obligatoire) — Input text, placeholder: "https://drive.google.com/... ou lien direct"
4. **Note** (optionnel) — Input text, placeholder: "Référence, code de réservation, infos utiles..."

Boutons : "Annuler" + "Enregistrer"

### Templates rapides (optionnel mais recommandé)

Sous le bouton "Ajouter un document", ajouter un menu secondaire ou des boutons rapides :

**"Ajout rapide"** — une rangée de petits boutons/chips qui pré-remplissent le type dans le formulaire :
- ✈️ Vol → ouvre le formulaire avec type=`flight` pré-sélectionné
- 🏨 Hôtel → ouvre le formulaire avec type=`hotel` pré-sélectionné
- 🛡️ Assurance → ouvre le formulaire avec type=`insurance` pré-sélectionné
- 🪪 Identité → ouvre le formulaire avec type=`identity` pré-sélectionné

Design : petits chips/badges cliquables en ligne, style `bg-card border border-border/50 rounded-full px-3 py-1 text-xs cursor-pointer hover:bg-muted`

---

## API Endpoints

### Endpoints à créer

```
GET    /api/trips/:tripId/documents          → Liste tous les documents du trip
POST   /api/trips/:tripId/documents          → Crée un nouveau document
PATCH  /api/trips/:tripId/documents/:docId   → Modifie un document
DELETE /api/trips/:tripId/documents/:docId   → Supprime un document
```

### Modification endpoint existant

L'endpoint `GET /api/trips/share/:token` (utilisé par la vue client) doit maintenant inclure le champ `documents` dans la réponse trip, avec la liste complète des `TripDocument[]` triés par `sortOrder` puis `createdAt`.

### Validation

- `name` : requis, string, max 200 chars
- `type` : requis, doit être une valeur valide de `TripDocumentType`
- `url` : requis, string, doit ressembler à une URL (commencer par `http://` ou `https://`)
- `note` : optionnel, string, max 500 chars
- `sortOrder` : optionnel, integer, défaut = 0

### Authentification

- Les endpoints CRUD nécessitent que l'utilisateur soit authentifié et propriétaire du trip
- L'endpoint share (`/api/trips/share/:token`) est public (comme actuellement) et retourne les documents en lecture seule

---

## Résumé des fichiers à modifier

1. **Schema/DB** : Créer la table `trip_documents` avec les champs `id`, `tripId`, `name`, `type`, `url`, `note`, `sortOrder`, `createdAt`
2. **API/Routes** : Créer les 4 endpoints CRUD pour les documents + modifier l'endpoint share pour inclure les documents
3. **`client-view.tsx`** :
   - `ClientAccueil` : Ajouter la card de raccourci vers les documents (après guideUrl, avant les villes)
   - `ClientInfosPratiques` : Ajouter la section Documents en haut du composant, avant les infos pratiques existantes
4. **`trip-details.tsx`** : Ajouter le tab "Documents" dans l'admin avec la liste, le formulaire d'ajout/édition, et les boutons d'ajout rapide
5. **Hooks** : Créer un hook `useDocuments(tripId)` avec React Query pour les opérations CRUD côté admin

---

## Contraintes techniques

- Pas d'upload de fichier — uniquement des URLs (vers Google Drive, Dropbox, liens directs, etc.). Cela simplifie énormément l'implémentation et évite de gérer du stockage fichier.
- Le champ `trip.guideUrl` reste inchangé et indépendant — il est exclusivement utilisé pour le carnet de voyage PDF sur l'onglet Accueil.
- Mobile-first : les cards documents doivent être facilement cliquables avec le pouce
- Dark mode compatible
- Garder la cohérence avec le design system existant (Card, Badge, Button de shadcn/ui, icônes lucide-react)
- La section documents dans l'onglet Infos doit gérer gracieusement le cas où il y a 0 documents (ne rien afficher, pas de message "aucun document")
