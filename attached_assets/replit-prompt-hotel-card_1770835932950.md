# Demande : Card hébergement dédiée dans le planning jour

## Contexte & Approche

Les hébergements sont déjà gérés comme des activités avec `type: "hotel"` dans le planning de chaque jour. Actuellement, ils sont rendus EXACTEMENT comme n'importe quelle autre activité (même card, même layout). On veut leur donner un **rendu visuel spécial et dédié** avec les infos que le client cherche en priorité sur place (adresse, check-in/out, numéro de confirmation, lien réservation).

**L'approche choisie est la plus simple possible** : on ajoute quelques champs optionnels au modèle `activity` existant (pas de nouvelle table, pas de nouveau endpoint). Quand une activité a `type === "hotel"`, on la rend avec un composant card dédié au lieu du rendu activité standard.

---

## Modifications du modèle de données

### Champs à ajouter au modèle Activity (tous optionnels)

```typescript
// Champs existants déjà utilisables pour l'hôtel :
// - title          → Nom de l'hôtel
// - time           → Heure de check-in
// - description    → Peut contenir des infos diverses
// - googleMapsUrl  → Lien Google Maps (adresse cliquable)
// - bookingUrl     → Lien de réservation
// - latitude/longitude → Pour la carte
// - note           → Notes libres

// NOUVEAUX champs à ajouter au schema activity :
interface ActivityHotelExtras {
  address?: string;              // Adresse complète de l'hôtel (texte)
  checkoutTime?: string;         // Heure de checkout (ex: "11:00") — le checkin utilise le champ `time` existant
  confirmationNumber?: string;   // Numéro / code de confirmation de réservation
  imageUrl?: string;             // URL vers une photo de l'hôtel
  phone?: string;                // Numéro de téléphone de l'hôtel
}
```

Ces champs sont ajoutés au modèle activity général mais ne sont utilisés/affichés que quand `type === "hotel"`. Ils restent `null`/`undefined` pour les autres types d'activités.

### Migration

Aucune migration destructive. On ajoute simplement 5 colonnes optionnelles (nullable) à la table activities. Les activités existantes ne sont pas impactées.

---

## Vue Client — Rendu spécial hôtel (`ClientJours` dans `client-view.tsx`)

### Logique de rendu

Dans le composant `ClientJours`, à l'endroit où les activités sont mappées et rendues, ajouter une condition à **deux niveaux** :

**Niveau 1 — Est-ce un hôtel ?**
```
activity.type === "hotel"
```

**Niveau 2 — A-t-il des détails hôtel remplis ?**
```typescript
const hasHotelDetails = activity.address 
  || activity.checkoutTime 
  || activity.confirmationNumber 
  || activity.imageUrl 
  || activity.phone;
```

**Rendu final :**
```
Si type === "hotel" ET hasHotelDetails → rendre <HotelCard /> (card premium dédiée)
Si type === "hotel" ET PAS hasHotelDetails → rendre la card activité STANDARD (exactement comme maintenant, aucun changement)
Sinon (type !== "hotel") → rendre la card activité standard (ne rien changer)
```

Ce comportement permet à l'admin de créer un hôtel "placeholder" (ex: "Hôtel à confirmer" avec juste le titre) qui s'affiche normalement dans le planning. Dès qu'il enrichit l'hôtel avec au moins un champ spécifique (adresse, check-out, confirmation, photo ou téléphone), la card bascule automatiquement vers le rendu premium.

### Positionnement de la HotelCard

Quand une activité hôtel a des détails (et donc utilise la `HotelCard`), elle doit apparaître **en haut de la liste des activités du jour**, avant les autres activités, même si l'hôtel n'est pas la première activité dans l'ordre. Logique :

1. Séparer les activités du jour en deux groupes : `hotelActivitiesWithDetails` (type === "hotel" ET hasHotelDetails) et `remainingActivities` (tout le reste, y compris les hôtels sans détails)
2. Rendre d'abord les `hotelActivitiesWithDetails` avec le composant `HotelCard`
3. Puis rendre les `remainingActivities` avec le rendu activité standard existant

Si un jour n'a aucune activité hôtel avec détails, rien ne change — tout est rendu normalement comme avant.

### Design de la `HotelCard`

La card hôtel doit être visuellement distincte des activités normales. C'est une card plus grande, plus "premium".

**Layout sans image (`imageUrl` absent) :**

```
┌──────────────────────────────────────────┐
│  🏨                                      │
│  ┌─────────────────────────────────────┐ │
│  │ [icône Hotel]  Nom de l'hôtel       │ │
│  │                                     │ │
│  │ 📍 123 Rue de Bangkok, Silom       →│ │
│  │                                     │ │
│  │ ┌───────────┐  ┌───────────┐        │ │
│  │ │ CHECK-IN  │  │ CHECK-OUT │        │ │
│  │ │  14:00    │  │  11:00    │        │ │
│  │ └───────────┘  └───────────┘        │ │
│  │                                     │ │
│  │ 🔖 Réf: ABC123XYZ                  │ │
│  │ 📞 +66 2 123 4567                  │ │
│  │                                     │ │
│  │ [Voir la réservation →]             │ │
│  └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Layout avec image (`imageUrl` présent) :**

```
┌──────────────────────────────────────────┐
│ ┌──────────────────────────────────────┐ │
│ │          PHOTO DE L'HÔTEL            │ │
│ │        (h-36, object-cover)          │ │
│ │                   ┌────────────────┐ │ │
│ │                   │ 🏨 Hébergement │ │ │
│ │                   └────────────────┘ │ │
│ └──────────────────────────────────────┘ │
│                                          │
│  Nom de l'hôtel                          │
│  📍 Adresse                            → │
│                                          │
│  ┌───────────┐  ┌───────────┐            │
│  │ CHECK-IN  │  │ CHECK-OUT │            │
│  │  14:00    │  │  11:00    │            │
│  └───────────┘  └───────────┘            │
│                                          │
│  🔖 Réf: ABC123     📞 +66 2 123 4567   │
│                                          │
│  [Voir la réservation →]                 │
└──────────────────────────────────────────┘
```

### Spécifications CSS détaillées

**Card container :**
- `Card` de shadcn/ui avec `overflow-hidden`
- Bordure gauche colorée : `border-l-4` avec la couleur du jour (`dayColor`) → même principe que le timeline des activités
- `bg-card` standard
- data-testid: `hotel-card-{activity.id}`

**Image (si `imageUrl` existe) :**
- `<img>` en haut de la card, pleine largeur
- `h-36 w-full object-cover rounded-t-md`
- Badge "Hébergement" en overlay en bas à droite de l'image : `absolute bottom-2 right-2`, `bg-purple-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full`, icône `Hotel` w-3 h-3 inline
- Si l'image ne charge pas (erreur) : masquer l'image et revenir au layout sans image — utiliser un `onError` handler

**Header (nom de l'hôtel) :**
- Icône `Hotel` dans un cercle `w-9 h-9 rounded-md bg-purple-500/15 text-purple-500 flex items-center justify-center`
- Nom : `text-base font-bold text-foreground` — le champ `activity.title`
- Si `activity.note` existe : l'afficher en dessous en `text-xs text-muted-foreground`

**Adresse (si `activity.address` ou `activity.googleMapsUrl` existe) :**
- Icône `MapPin` w-3.5 h-3.5 text-muted-foreground
- Texte de l'adresse en `text-xs text-muted-foreground`
- Si `googleMapsUrl` existe : toute la ligne est cliquable, ouvre dans un nouvel onglet, avec icône `ExternalLink` w-3 h-3 à droite
- Si pas d'`address` mais un `googleMapsUrl` → afficher "Voir sur Google Maps" comme texte de lien
- data-testid: `hotel-address-{activity.id}`

**Bloc check-in / check-out :**
- Deux "mini-cards" côte à côte dans un `flex gap-3`
- Chaque mini-card : `flex-1 bg-muted/50 rounded-lg p-3 text-center`
- Label en haut : `text-[10px] font-bold uppercase tracking-wider text-muted-foreground` → "CHECK-IN" ou "CHECK-OUT"
- Heure en dessous : `text-lg font-bold text-foreground`
- Check-in utilise le champ existant `activity.time`
- Check-out utilise le nouveau champ `activity.checkoutTime`
- Si `activity.time` n'existe pas → ne pas afficher le bloc check-in
- Si `activity.checkoutTime` n'existe pas → ne pas afficher le bloc check-out
- Si aucun des deux n'existe → ne pas afficher ce bloc du tout

**Infos complémentaires (confirmation + téléphone) :**
- Layout en `flex flex-wrap gap-x-4 gap-y-1`
- Confirmation (si `confirmationNumber` existe) : icône `Ticket` ou `Hash` w-3.5 h-3.5 + texte `text-xs font-mono` → le numéro, avec un bouton copier discret (icône `Copy` w-3 h-3) qui copie dans le presse-papier au clic + mini toast "Copié !"
- Téléphone (si `phone` existe) : icône `Phone` w-3.5 h-3.5 + texte `text-xs` → le numéro, cliquable avec `href="tel:{phone}"`
- data-testid: `hotel-confirmation-{activity.id}`, `hotel-phone-{activity.id}`

**Bouton réservation (si `bookingUrl` existe) :**
- Bouton pleine largeur en bas de la card
- Style : `Button` variant `outline`, taille `sm`, pleine largeur `w-full`
- Texte : "Voir la réservation" avec icône `ExternalLink` w-3.5 h-3.5 à droite
- Au clic : `window.open(activity.bookingUrl, '_blank')`
- data-testid: `hotel-booking-{activity.id}`

**Espacements internes :**
- Padding général du contenu (sous l'image) : `p-4`
- `space-y-3` entre chaque bloc (header, adresse, check-in/out, infos, bouton)

### Comportement responsive

La card est déjà dans le container mobile-first de `ClientJours`. Pas besoin de media queries spécifiques. Les deux mini-cards check-in/check-out restent côte à côte même sur petit écran (elles font `flex-1` avec un `gap-3`).

---

## Vue Admin — Formulaire activité hôtel (`trip-details.tsx`)

### Champs conditionnels dans le formulaire d'activité

Dans le formulaire d'ajout/édition d'activité, quand l'admin sélectionne `type = "hotel"`, afficher des **champs supplémentaires** qui n'apparaissent pas pour les autres types :

**Champs toujours affichés (existants, ne pas modifier) :**
- Titre (= nom de l'hôtel)
- Heure (= heure de check-in)
- Type (select : food, transport, hotel, shopping, nightlife, activity)
- Lien Google Maps
- Lien de réservation (bookingUrl)
- Description / Notes

**Champs supplémentaires affichés UNIQUEMENT si type === "hotel"** (avec une transition douce d'apparition) :

1. **Adresse** — Input text, placeholder: "Adresse complète de l'hôtel"
2. **Heure de check-out** — Input text (ou time picker), placeholder: "11:00"
3. **Numéro de confirmation** — Input text, placeholder: "Ex: ABC123XYZ"
4. **Téléphone** — Input text, placeholder: "+66 2 123 4567"
5. **Photo de l'hôtel (URL)** — Input text, placeholder: "https://... (URL de la photo)"

Ces champs apparaissent dans une section visuellement séparée sous les champs standards, avec un petit header "Détails hébergement" et une bordure ou un fond `bg-purple-500/5 border border-purple-500/20 rounded-lg p-4`.

### Labels et organisation dans le formulaire admin

```
── Informations générales ──
[Titre]           → "Nom de l'hôtel"
[Type]            → Sélectionné : "Hébergement"
[Heure]           → Devient "Heure de check-in" quand type=hotel

── Détails hébergement ── (section conditionnelle, visible si type=hotel)
[Adresse]
[Check-out]       → à côté du check-in si la place le permet (2 colonnes)
[Confirmation]
[Téléphone]
[Photo URL]

── Liens ──
[Google Maps URL]
[Réservation URL]

── Notes ──
[Description / Notes libres]
```

---

## Résumé des fichiers à modifier

1. **Schema/DB** : Ajouter 5 colonnes optionnelles à la table `activities` :
   - `address` (text, nullable)
   - `checkoutTime` (text, nullable)
   - `confirmationNumber` (text, nullable)
   - `imageUrl` (text, nullable)
   - `phone` (text, nullable)

2. **API** : S'assurer que les 5 nouveaux champs sont inclus dans les opérations CRUD des activités (GET/POST/PATCH). Pas de nouvel endpoint nécessaire.

3. **`client-view.tsx`** :
   - Créer le composant `HotelCard` (dans le même fichier ou dans un composant séparé)
   - Dans `ClientJours` : séparer les activités hotel/non-hotel, rendre les `HotelCard` en premier, puis les activités standards
   - Le reste du rendu des activités non-hotel ne change absolument pas

4. **`trip-details.tsx`** :
   - Ajouter les 5 champs conditionnels dans le formulaire d'activité quand `type === "hotel"`
   - Section visuelle "Détails hébergement" avec fond violet léger

---

## Contraintes techniques

- **Rendu conditionnel à deux niveaux** : une activité `type === "hotel"` sans aucun champ hôtel rempli s'affiche EXACTEMENT comme avant (card activité standard). La HotelCard premium ne se déclenche que si au moins un des 5 champs spécifiques (`address`, `checkoutTime`, `confirmationNumber`, `imageUrl`, `phone`) est renseigné. C'est la contrainte la plus importante.
- Les 5 nouveaux champs sont 100% optionnels — une activité hotel avec seulement 1 ou 2 champs remplis affiche la HotelCard mais ne montre que les blocs correspondants aux champs remplis
- La HotelCard se dégrade gracieusement : chaque bloc (image, adresse, check-in/out, confirmation, téléphone, bouton réservation) apparaît uniquement si le champ correspondant a une valeur
- Aucun impact sur les activités non-hotel — leur rendu reste strictement identique
- La copie du numéro de confirmation dans le presse-papier utilise `navigator.clipboard.writeText()` avec un fallback
- Dark mode compatible
- Mobile-first
