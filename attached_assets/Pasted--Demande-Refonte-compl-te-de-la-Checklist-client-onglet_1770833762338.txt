# Demande : Refonte complète de la Checklist client (onglet "Check")

## Contexte

L'onglet "Check" de la vue client (`client-view.tsx` → composant `ClientChecklist`) est actuellement une simple liste à cocher par catégorie avec une barre de progression. Je veux en faire une **checklist premium, contextuelle et organisée par phases temporelles** pour que le client ait une vraie valeur ajoutée.

## État actuel (à remplacer)

Le composant `ClientChecklist` affiche :
- Une barre de progression globale (items cochés / total)
- Des items groupés par `item.category` (plat, une seule couche)
- Chaque item a : `id`, `text`, `category`, `isCritical`
- Le state coché/décoché est stocké en `localStorage` via le hook `useLocalChecklist(token)`

Le hook `useLocalChecklist` gère un `Set<itemId>` dans `localStorage` avec la clé `checklist_{token}`.

---

## Nouveau modèle de données

### Modification du schema checklist item (côté serveur/base de données)

Ajouter un champ **`phase`** à chaque checklist item. Valeurs possibles :
- `"before"` → "Bien avant le départ" (J-30 à J-14)
- `"week"` → "La semaine avant" (J-7 à J-1)  
- `"pack"` → "Dans la valise"

Ajouter un champ **`subcategory`** (optionnel, string) pour les sous-groupes dans la phase "pack". Valeurs possibles pour le packing :
- `"essentiels"` → Essentiels (passeport, billets, chargeurs, médicaments)
- `"vetements"` → Vêtements
- `"toilette"` → Toilette & Santé
- `"tech"` → Tech & Connectivité
- `"confort"` → Confort voyage

Ajouter un champ optionnel **`hint`** (string, max 120 chars) → petit texte d'aide contextuel affiché sous l'item (ex: "Vérifier la validité 6 mois après la date de retour").

Ajouter un champ optionnel **`link`** (string, URL) → lien externe utile (ex: lien vers le site de demande de visa, lien vers l'institut Pasteur, etc.).

### Résumé des champs d'un checklist item après modification :

```typescript
interface ChecklistItem {
  id: number;
  text: string;
  category: string;           // gardé pour rétro-compatibilité
  isCritical: boolean;
  phase: "before" | "week" | "pack";   // NOUVEAU
  subcategory?: string;                 // NOUVEAU (utilisé surtout pour phase "pack")
  hint?: string;                        // NOUVEAU
  link?: string;                        // NOUVEAU
}
```

---

## Nouveau composant `ClientChecklist` — Spécifications UI

### Structure globale

L'onglet "Check" côté client doit afficher :

1. **Header avec progression globale** (garder le design actuel avec barre de progression, le pourcentage et le compteur x/total)

2. **3 sections accordéon** correspondant aux 3 phases, chacune avec :
   - Un header cliquable pour expand/collapse
   - Une icône + titre de la phase
   - Un mini compteur de progression par phase (ex: "3/8")
   - Un badge de couleur différente par phase

3. **À l'intérieur de chaque phase**, les items groupés par `category` (pour "before" et "week") ou par `subcategory` (pour "pack")

### Design des 3 phases

**Phase 1 — "Bien avant le départ"**
- Icône : `Calendar` (lucide-react)
- Couleur badge/accent : `blue-500`
- Emoji header : 📋
- Items typiques : passeport, visa, vaccins, assurance, prévenir banque, réservations anticipées

**Phase 2 — "La semaine avant"**
- Icône : `Clock` (lucide-react)
- Couleur badge/accent : `amber-500`  
- Emoji header : ⏰
- Items typiques : check-in en ligne, télécharger boarding pass, acheter devise, eSIM, cartes offline, pharmacie de base

**Phase 3 — "Dans la valise"**
- Icône : `ShoppingBag` (lucide-react)
- Couleur badge/accent : `emerald-500`
- Emoji header : 🧳
- Items groupés par `subcategory` avec sous-headers visuels

### Design d'un item checklist

Chaque item doit afficher :
- Checkbox custom (garder le design actuel avec le carré arrondi + icône Check)
- Texte de l'item
- Badge "!" rouge si `isCritical` (garder)
- **NOUVEAU** : Si `hint` existe → afficher une ligne de texte gris clair en dessous du texte principal (text-xs text-muted-foreground)
- **NOUVEAU** : Si `link` existe → afficher une petite icône `ExternalLink` cliquable à droite qui ouvre le lien dans un nouvel onglet
- **NOUVEAU** : Badge "Essentiel" (petit, rouge/orange) pour les items marqués `isCritical` dans la phase "pack" subcategory "essentiels", en remplacement du simple "!"

### Comportement des accordéons

- Par défaut, les 3 phases sont **toutes ouvertes**
- Si TOUS les items d'une phase sont cochés → la section se collapse automatiquement avec un indicateur vert ✅ et le texte "Terminé !" à côté du titre
- L'utilisateur peut toujours re-ouvrir une section collapsée en cliquant dessus
- Animation douce d'ouverture/fermeture (transition CSS `max-height` ou `grid-template-rows`)

### Confettis / feedback de complétion

Quand la progression globale atteint **100%** :
- Afficher un petit message de félicitations en haut : "🎉 Tout est prêt pour le départ !"  
- Card avec fond `emerald-500/10` et bordure `emerald-500/20`
- Le pourcentage de la barre de progression passe en `text-green-500` (déjà le cas)

---

## Côté Admin (trip-details.tsx — ChecklistView)

### Modifications du formulaire d'ajout/édition d'item

Quand l'admin ajoute ou modifie un checklist item, le formulaire doit inclure :

1. **Champ `phase`** → Select/dropdown avec les 3 options :
   - "Bien avant le départ" (value: `before`)
   - "La semaine avant" (value: `week`)
   - "Dans la valise" (value: `pack`)

2. **Champ `subcategory`** → Select conditionnel, affiché **uniquement si phase = "pack"** :
   - "Essentiels" (value: `essentiels`)
   - "Vêtements" (value: `vetements`)
   - "Toilette & Santé" (value: `toilette`)
   - "Tech & Connectivité" (value: `tech`)
   - "Confort voyage" (value: `confort`)

3. **Champ `hint`** → Input texte optionnel, placeholder: "Conseil ou info contextuelle (optionnel)"

4. **Champ `link`** → Input URL optionnel, placeholder: "https://..."

### Templates pré-remplis (fonctionnalité admin)

Ajouter un bouton **"Générer checklist type"** dans la vue admin de la checklist. Au clic, ouvrir un petit dialogue/modal qui propose :

**Option 1 — "Checklist voyage international"** → pré-remplit avec ~25-30 items standards répartis dans les 3 phases :

Phase `before` :
- Vérifier la validité du passeport (hint: "Doit être valide 6 mois après la date de retour", isCritical: true)
- Vérifier les conditions de visa (hint: "Selon la destination et la durée du séjour")
- Souscrire une assurance voyage
- Photocopier les documents importants (hint: "Passeport, billets, assurance — garder une copie numérique")
- Prévenir sa banque (hint: "Activer l'option paiement à l'étranger")
- Vérifier les vaccins recommandés
- Réserver les activités à forte demande

Phase `week` :
- Faire l'enregistrement en ligne (hint: "Ouvre généralement 24-48h avant le vol")
- Télécharger les cartes offline Google Maps (hint: "Indispensable en cas de mauvaise connexion")
- Acheter une eSIM ou carte SIM locale (link possible vers provider)
- Télécharger les billets/boarding pass
- Vérifier toutes les confirmations de réservation
- Préparer une trousse de pharmacie de base (hint: "Doliprane, pansements, anti-diarrhéique, antihistaminique")
- Mettre à jour ses contacts d'urgence
- Faire les lessives nécessaires
- Vérifier la météo de la destination

Phase `pack` / subcategory `essentiels` :
- Passeport (isCritical: true)
- Billets d'avion / boarding pass (isCritical: true)
- Confirmations d'hôtel imprimées
- Assurance voyage (copie)
- Carte bancaire + copie (isCritical: true)
- Argent liquide en devise locale
- Médicaments personnels (isCritical: true, si applicable)

Phase `pack` / subcategory `tech` :
- Chargeur de téléphone (isCritical: true)
- Adaptateur de prise (hint: "Type de prise selon destination")
- Batterie externe / power bank
- Écouteurs
- Câble de charge supplémentaire

Phase `pack` / subcategory `vetements` :
- Vêtements pour X jours (hint: "Adaptés au climat de la destination")
- Sous-vêtements
- Pyjama
- Veste / couche supplémentaire
- Chaussures de marche confortables
- Tenue habillée (hint: "Si restaurant ou sortie prévue")

Phase `pack` / subcategory `toilette` :
- Brosse à dents + dentifrice
- Crème solaire
- Shampooing / gel douche (format voyage)
- Déodorant
- Trousse de pharmacie

Phase `pack` / subcategory `confort` :
- Masque de sommeil
- Boules Quies / bouchons d'oreilles
- Coussin de nuque (si vol long-courrier)
- Sac plastique pour linge sale
- Cadenas pour valise

**Option 2 — "Checklist week-end / court séjour"** → version allégée avec ~15 items, moins de formalités administratives, packing list réduite.

**Comportement du bouton "Générer checklist type"** :
- Si la checklist est déjà non-vide → afficher une confirmation "Cela va ajouter X items à la checklist existante. Continuer ?" (les items existants ne sont PAS supprimés, on ajoute les templates EN PLUS)
- Chaque item template généré reçoit un `id` unique (auto-incrémenté ou UUID)
- Après génération, l'admin peut supprimer/modifier/réorganiser les items comme d'habitude

---

## Migration / Rétro-compatibilité

- Les checklist items existants qui n'ont pas de `phase` → leur assigner `phase: "pack"` et `subcategory` basée sur leur `category` existante (mapper intelligemment)
- Les items existants sans `hint` ni `link` → ces champs restent `null`/`undefined`, aucun impact visuel
- Le champ `category` est conservé mais devient secondaire par rapport à `phase` + `subcategory`

---

## Résumé des fichiers à modifier

1. **Schema/DB** : Ajouter les champs `phase`, `subcategory`, `hint`, `link` au modèle checklist item
2. **API** : S'assurer que les nouveaux champs sont envoyés/reçus correctement
3. **`client-view.tsx`** → Composant `ClientChecklist` : refonte complète avec les 3 phases accordéon, sous-catégories, hints, links, animation de complétion
4. **`trip-details.tsx`** → `ChecklistView` : ajouter les champs au formulaire d'ajout/édition + bouton "Générer checklist type" avec les 2 templates
5. **Migration des données existantes** : script ou logique pour assigner un `phase` par défaut aux items existants

---

## Contraintes techniques

- Garder le hook `useLocalChecklist` pour le state coché/décoché côté client (localStorage)
- Garder le design system existant (Card, Badge, Progress, etc. de shadcn/ui)
- Garder le dark mode compatible
- Animations CSS fluides pour les accordéons (pas de librairie externe nécessaire)
- Mobile-first : tout doit être parfait sur mobile (c'est la vue principale du client)
