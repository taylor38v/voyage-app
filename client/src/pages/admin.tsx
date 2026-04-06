import { Layout } from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { buildUrl } from "@shared/routes";
import { useState, useRef, useEffect } from "react";
import { Loader2, Plus, Trash2, ChevronDown, ChevronRight, MapPin, Map as MapIcon, Users, Calendar, Save, Copy, ExternalLink, Upload, FileText, X, Lightbulb, Sparkles, Wand2, Check, AlertCircle, Pencil, Hotel, UtensilsCrossed, Bus, Zap, MoreHorizontal, Wallet, Info, Phone, Globe, Banknote, Plug, Wifi, Plane, Shield, Camera, UserPlus, Link, ToggleLeft, ToggleRight, RefreshCw, Crown, Mail, CheckSquare, CreditCard } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { useAuth } from "@/hooks/use-auth";
import type { Trip, TripWithDetails } from "@shared/schema";
import type { User } from "@shared/models/auth";

function useAdminTrips() {
  return useQuery<Trip[]>({
    queryKey: ["/api/admin/trips"],
    queryFn: async () => {
      const res = await fetch("/api/admin/trips", { credentials: "include" });
      if (res.status === 401 || res.status === 403) throw new Error("Accès refusé");
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
  });
}

function useAdminTrip(id: number | null) {
  return useQuery<TripWithDetails | null>({
    queryKey: ["/api/admin/trips", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await fetch(`/api/admin/trips/${id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id,
  });
}

function ClientEmailsEditor({ emails, onChange }: { emails: string, onChange: (v: string) => void }) {
  const list = emails ? emails.split(",").map(e => e.trim()).filter(Boolean) : [];
  const [newEmail, setNewEmail] = useState("");

  const addEmail = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || list.length >= 10) return;
    if (list.map(e => e.toLowerCase()).includes(trimmed)) return;
    onChange([...list, trimmed].join(", "));
    setNewEmail("");
  };

  const removeEmail = (idx: number) => {
    onChange(list.filter((_, i) => i !== idx).join(", "));
  };

  return (
    <div className="space-y-2">
      {list.map((email, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="flex-1 px-3 py-1.5 bg-background rounded-md border border-border text-sm truncate" data-testid={`text-client-email-${idx}`}>
            {email}
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={() => removeEmail(idx)} data-testid={`button-remove-email-${idx}`}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
      {list.length < 10 && (
        <div className="flex items-center gap-2">
          <Input
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="client@example.com"
            type="email"
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
            data-testid="admin-input-client-email"
          />
          <Button type="button" variant="outline" onClick={addEmail} data-testid="button-add-email">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">{list.length}/10 emails</p>
    </div>
  );
}

function TripForm({ trip, onSaved }: { trip?: Trip | null, onSaved: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState(trip?.title || "");
  const [destination, setDestination] = useState(trip?.destination || "");
  const [origin, setOrigin] = useState(trip?.origin || "");
  const [subtitle, setSubtitle] = useState(trip?.subtitle || "");
  const [coverEmoji, setCoverEmoji] = useState(trip?.coverEmoji || "");
  const [coverImageUrl, setCoverImageUrl] = useState(trip?.coverImageUrl || "");
  const [welcomeText, setWelcomeText] = useState(trip?.welcomeText || "");
  const [totalBudget, setTotalBudget] = useState(String(trip?.totalBudget || 0));
  const [budgetHotel, setBudgetHotel] = useState(String(trip?.budgetHotel || 0));
  const [budgetFood, setBudgetFood] = useState(String(trip?.budgetFood || 0));
  const [budgetTransport, setBudgetTransport] = useState(String(trip?.budgetTransport || 0));
  const [budgetActivities, setBudgetActivities] = useState(String(trip?.budgetActivities || 0));
  const [budgetOther, setBudgetOther] = useState(String(trip?.budgetOther || 0));
  const [currency, setCurrency] = useState(trip?.currency || "€");
  const [travelers, setTravelers] = useState(String(trip?.travelers || 2));
  const [assignedToEmail, setAssignedToEmail] = useState(trip?.assignedToEmail || "");
  const [status, setStatus] = useState(trip?.status || "draft");
  const [departureDate, setDepartureDate] = useState(trip?.departureDate ? String(trip.departureDate).split("T")[0] : "");
  const [returnDate, setReturnDate] = useState(trip?.returnDate ? String(trip.returnDate).split("T")[0] : "");
  const [googleMyMapsUrl, setGoogleMyMapsUrl] = useState(trip?.googleMyMapsUrl || "");
  const [participantNames, setParticipantNames] = useState<string[]>(trip?.participants || []);
  const [newParticipant, setNewParticipant] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [travelInfo, setTravelInfo] = useState(trip?.travelInfo || {} as any);
  const updateInfo = (key: string, value: any) => setTravelInfo((prev: any) => ({ ...prev, [key]: value }));
  const { uploadFile } = useUpload();

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const result = await uploadFile(file);
      if (result) {
        setCoverImageUrl(result.objectPath);
        toast({ title: "Photo de couverture ajoutée" });
      }
    } catch {
      toast({ title: "Erreur lors de l'upload", variant: "destructive" });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = trip ? `/api/admin/trips/${trip.id}` : "/api/admin/trips";
      const method = trip ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips"] });
      toast({ title: trip ? "Voyage mis à jour" : "Voyage créé" });
      onSaved();
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const catSum = Number(budgetHotel) + Number(budgetFood) + Number(budgetTransport) + Number(budgetActivities) + Number(budgetOther);
    const finalBudget = catSum > 0 ? catSum : Number(totalBudget);
    const hasInfo = Object.values(travelInfo).some((v: any) => v !== undefined && v !== "" && v !== null);
    mutation.mutate({ title, destination, origin: origin || null, subtitle, coverEmoji, coverImageUrl: coverImageUrl || null, welcomeText: welcomeText || null, totalBudget: finalBudget, budgetHotel: Number(budgetHotel), budgetFood: Number(budgetFood), budgetTransport: Number(budgetTransport), budgetActivities: Number(budgetActivities), budgetOther: Number(budgetOther), currency, travelers: Number(travelers), assignedToEmail: assignedToEmail || null, status, departureDate: departureDate || null, returnDate: returnDate || null, googleMyMapsUrl: googleMyMapsUrl || null, participants: participantNames.length > 0 ? participantNames : [], travelInfo: hasInfo ? travelInfo : null });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Titre du voyage</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} required data-testid="admin-input-title" />
        </div>
        <div>
          <Label>Pays de départ</Label>
          <Input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Ex: France" data-testid="admin-input-origin" />
        </div>
        <div>
          <Label>Destination</Label>
          <Input value={destination} onChange={e => setDestination(e.target.value)} data-testid="admin-input-destination" />
        </div>
        <div>
          <Label>Sous-titre</Label>
          <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} data-testid="admin-input-subtitle" />
        </div>
        <div>
          <Label>Emoji couverture</Label>
          <Input value={coverEmoji} onChange={e => setCoverEmoji(e.target.value)} data-testid="admin-input-emoji" />
        </div>
        <div>
          <Label>Budget total</Label>
          <Input type="number" value={totalBudget} onChange={e => setTotalBudget(e.target.value)} data-testid="admin-input-budget" />
        </div>
        <div>
          <Label>Devise</Label>
          <Input value={currency} onChange={e => setCurrency(e.target.value)} data-testid="admin-input-currency" />
        </div>
        <div>
          <Label>Voyageurs</Label>
          <Input type="number" value={travelers} onChange={e => setTravelers(e.target.value)} data-testid="admin-input-travelers" />
        </div>
        <div>
          <Label>Statut</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger data-testid="admin-select-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="archived">Archivé</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Date de départ</Label>
          <Input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} data-testid="admin-input-departure-date" />
        </div>
        <div>
          <Label>Date de retour</Label>
          <Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} data-testid="admin-input-return-date" />
        </div>
      </div>

      <div className="bg-muted/50 rounded-md p-4 border border-border/50">
        <Label className="text-base font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Participants (Tricount)
        </Label>
        <p className="text-xs text-muted-foreground mb-2">Nommez les participants pour le partage de dépenses</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {participantNames.map((name, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pr-1" data-testid={`badge-participant-${i}`}>
              {name}
              <button
                type="button"
                onClick={() => setParticipantNames(prev => prev.filter((_, j) => j !== i))}
                className="ml-0.5 rounded-full p-0.5"
                data-testid={`button-remove-participant-${i}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        {participantNames.length < 10 && (
          <div className="flex items-center gap-2">
            <Input
              value={newParticipant}
              onChange={e => setNewParticipant(e.target.value)}
              placeholder="Nom du participant"
              onKeyDown={e => {
                if (e.key === "Enter" && newParticipant.trim()) {
                  e.preventDefault();
                  setParticipantNames(prev => [...prev, newParticipant.trim()]);
                  setNewParticipant("");
                }
              }}
              data-testid="admin-input-participant"
            />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              disabled={!newParticipant.trim()}
              onClick={() => { setParticipantNames(prev => [...prev, newParticipant.trim()]); setNewParticipant(""); }}
              data-testid="button-add-participant"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-1.5">{participantNames.length}/10 participants</p>
      </div>

      <div className="bg-muted/50 rounded-md p-4 border border-border/50">
        <Label className="text-base font-bold flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Budget par catégorie
        </Label>
        <p className="text-xs text-muted-foreground mb-3">Définissez le budget prévu pour chaque poste de dépense</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs flex items-center gap-1.5 mb-1"><Hotel className="w-3.5 h-3.5 text-purple-400" /> Hébergement</Label>
            <Input type="number" value={budgetHotel} onChange={e => setBudgetHotel(e.target.value)} min="0" data-testid="admin-input-budget-hotel" />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1.5 mb-1"><UtensilsCrossed className="w-3.5 h-3.5 text-orange-400" /> Repas</Label>
            <Input type="number" value={budgetFood} onChange={e => setBudgetFood(e.target.value)} min="0" data-testid="admin-input-budget-food" />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1.5 mb-1"><Bus className="w-3.5 h-3.5 text-blue-400" /> Transport</Label>
            <Input type="number" value={budgetTransport} onChange={e => setBudgetTransport(e.target.value)} min="0" data-testid="admin-input-budget-transport" />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1.5 mb-1"><Zap className="w-3.5 h-3.5 text-emerald-400" /> Activités</Label>
            <Input type="number" value={budgetActivities} onChange={e => setBudgetActivities(e.target.value)} min="0" data-testid="admin-input-budget-activities" />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1.5 mb-1"><MoreHorizontal className="w-3.5 h-3.5 text-gray-400" /> Autre</Label>
            <Input type="number" value={budgetOther} onChange={e => setBudgetOther(e.target.value)} min="0" data-testid="admin-input-budget-other" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total catégories</span>
          <span className="text-sm font-bold text-foreground">{currency}{(Number(budgetHotel) + Number(budgetFood) + Number(budgetTransport) + Number(budgetActivities) + Number(budgetOther)).toLocaleString()}</span>
        </div>
      </div>

      <div className="bg-muted/50 rounded-md p-4 border border-border/50">
        <Label className="text-base font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Emails des clients
        </Label>
        <p className="text-xs text-muted-foreground mb-2">Ajoutez jusqu'{"à"} 10 emails de clients qui auront accès au voyage</p>
        <ClientEmailsEditor emails={assignedToEmail} onChange={setAssignedToEmail} />
      </div>

      <div className="bg-muted/50 rounded-md p-4 border border-border/50">
        <Label className="text-base font-bold flex items-center gap-2">
          <MapIcon className="w-4 h-4 text-primary" />
          Google My Maps
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Collez le lien de partage de votre carte Google My Maps (ex: https://www.google.com/maps/d/...)
        </p>
        <Input
          value={googleMyMapsUrl}
          onChange={e => setGoogleMyMapsUrl(e.target.value)}
          placeholder="https://www.google.com/maps/d/u/0/edit?mid=..."
          data-testid="admin-input-google-my-maps"
        />
        {googleMyMapsUrl && (
          <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Carte Google My Maps configurée
          </p>
        )}
      </div>

      <div className="bg-muted/50 rounded-md p-4 border border-border/50">
        <Label className="text-base font-bold flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary" />
          Photo de couverture
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Cette photo remplacera l'emoji sur la page d'accueil du client
        </p>
        {coverImageUrl && (
          <div className="relative mb-3">
            <img
              src={coverImageUrl}
              alt="Couverture"
              className="w-full h-32 object-cover rounded-md"
              data-testid="admin-cover-preview"
            />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2"
              onClick={() => setCoverImageUrl("")}
              data-testid="admin-button-remove-cover"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
        <label className="cursor-pointer">
          <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md hover-elevate text-sm text-muted-foreground">
            {isUploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isUploadingCover ? "Upload en cours..." : "Choisir une photo"}
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverUpload}
            disabled={isUploadingCover}
            data-testid="admin-input-cover-photo"
          />
        </label>
      </div>

      <div className="bg-muted/50 rounded-md p-4 border border-border/50">
        <Label className="text-base font-bold flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Texte d'accueil
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Message personnalisé affiché sur l'accueil client (ex: "Bonjour Jér{"ô"}me, votre aventure vous attend !")
        </p>
        <Textarea
          value={welcomeText}
          onChange={e => setWelcomeText(e.target.value)}
          placeholder="Bonjour, votre voyage vous attend !"
          className="resize-none"
          rows={2}
          data-testid="admin-input-welcome-text"
        />
      </div>

      <div className="bg-muted/50 rounded-md p-4 border border-border/50">
        <Label className="text-base font-bold flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          Infos pratiques
        </Label>
        <p className="text-xs text-muted-foreground mb-3">Informations utiles pour le voyageur : urgences, devise, prises, etc.</p>

        <div className="space-y-4">
          <div className="bg-background/50 rounded-md p-3 border border-border/30">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Urgences
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">N{"\u00b0"} urgences général</Label>
                <Input value={travelInfo.emergencyLocal || ""} onChange={e => updateInfo("emergencyLocal", e.target.value)} placeholder="ex: 191" data-testid="admin-input-emergency-local" />
              </div>
              <div>
                <Label className="text-xs">Police</Label>
                <Input value={travelInfo.emergencyPolice || ""} onChange={e => updateInfo("emergencyPolice", e.target.value)} placeholder="ex: 191" data-testid="admin-input-emergency-police" />
              </div>
              <div>
                <Label className="text-xs">Ambulance / SAMU</Label>
                <Input value={travelInfo.emergencyAmbulance || ""} onChange={e => updateInfo("emergencyAmbulance", e.target.value)} placeholder="ex: 1669" data-testid="admin-input-emergency-ambulance" />
              </div>
              <div>
                <Label className="text-xs">Pompiers</Label>
                <Input value={travelInfo.emergencyFire || ""} onChange={e => updateInfo("emergencyFire", e.target.value)} placeholder="ex: 199" data-testid="admin-input-emergency-fire" />
              </div>
            </div>
          </div>

          <div className="bg-background/50 rounded-md p-3 border border-border/30">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Ambassade / Consulat
            </p>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <Label className="text-xs">Adresse / infos</Label>
                <Input value={travelInfo.embassy || ""} onChange={e => updateInfo("embassy", e.target.value)} placeholder="Ambassade de France, Bangkok" data-testid="admin-input-embassy" />
              </div>
              <div>
                <Label className="text-xs">Téléphone</Label>
                <Input value={travelInfo.embassyPhone || ""} onChange={e => updateInfo("embassyPhone", e.target.value)} placeholder="+66 2 657 5100" data-testid="admin-input-embassy-phone" />
              </div>
            </div>
          </div>

          <div className="bg-background/50 rounded-md p-3 border border-border/30">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Fuseau horaire
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Fuseau</Label>
                <Input value={travelInfo.timezone || ""} onChange={e => updateInfo("timezone", e.target.value)} placeholder="ex: Asia/Bangkok" data-testid="admin-input-timezone" />
              </div>
              <div>
                <Label className="text-xs">Décalage</Label>
                <Input value={travelInfo.timezoneOffset || ""} onChange={e => updateInfo("timezoneOffset", e.target.value)} placeholder="ex: UTC+7 (+6h vs Paris)" data-testid="admin-input-timezone-offset" />
              </div>
            </div>
          </div>

          <div className="bg-background/50 rounded-md p-3 border border-border/30">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5" /> Devise & pourboire
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Devise locale</Label>
                <Input value={travelInfo.localCurrency || ""} onChange={e => updateInfo("localCurrency", e.target.value)} placeholder="ex: Baht thaïlandais" data-testid="admin-input-local-currency" />
              </div>
              <div>
                <Label className="text-xs">Symbole</Label>
                <Input value={travelInfo.localCurrencySymbol || ""} onChange={e => updateInfo("localCurrencySymbol", e.target.value)} placeholder="ex: \u0e3f" data-testid="admin-input-local-currency-symbol" />
              </div>
              <div>
                <Label className="text-xs">Taux (1{currency} = ?)</Label>
                <Input type="number" step="0.01" value={travelInfo.exchangeRate || ""} onChange={e => updateInfo("exchangeRate", e.target.value ? Number(e.target.value) : undefined)} placeholder="ex: 38.5" data-testid="admin-input-exchange-rate" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Culture du pourboire</Label>
                <Textarea value={travelInfo.tippingCulture || ""} onChange={e => updateInfo("tippingCulture", e.target.value)} placeholder="ex: Pas obligatoire mais apprécié, 20-50 THB au restaurant" className="resize-none" rows={2} data-testid="admin-input-tipping" />
              </div>
            </div>
          </div>

          <div className="bg-background/50 rounded-md p-3 border border-border/30">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Plug className="w-3.5 h-3.5" /> Prises électriques
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Voltage</Label>
                <Input value={travelInfo.voltage || ""} onChange={e => updateInfo("voltage", e.target.value)} placeholder="ex: 220V / 50Hz" data-testid="admin-input-voltage" />
              </div>
              <div>
                <Label className="text-xs">Type de prise</Label>
                <Input value={travelInfo.plugType || ""} onChange={e => updateInfo("plugType", e.target.value)} placeholder="ex: Type A, B, C (pas d'adaptateur nécessaire)" data-testid="admin-input-plug-type" />
              </div>
            </div>
          </div>

          <div className="bg-background/50 rounded-md p-3 border border-border/30">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5" /> SIM & WiFi
            </p>
            <Textarea value={travelInfo.simWifi || ""} onChange={e => updateInfo("simWifi", e.target.value)} placeholder="ex: Carte SIM TrueMove H disponible à l'aéroport (300 THB / 8j), WiFi gratuit dans la plupart des hôtels et cafés" className="resize-none" rows={2} data-testid="admin-input-sim-wifi" />
          </div>

          <div className="bg-background/50 rounded-md p-3 border border-border/30">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" /> Notes complémentaires
            </p>
            <Textarea value={travelInfo.customNotes || ""} onChange={e => updateInfo("customNotes", e.target.value)} placeholder="Autres informations utiles pour le voyageur..." className="resize-none" rows={3} data-testid="admin-input-custom-notes" />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/50 py-3 -mx-1 px-1">
        <Button type="submit" disabled={mutation.isPending} className="w-full" data-testid="admin-button-save-trip">
          <Save className="w-4 h-4 mr-1" />
          {mutation.isPending ? "Enregistrement..." : trip ? "Enregistrer les modifications" : "Créer le voyage"}
        </Button>
      </div>
    </form>
  );
}

function DayEditor({ tripId, trip }: { tripId: number, trip: TripWithDetails }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [newDay, setNewDay] = useState(false);
  const [dayForm, setDayForm] = useState({ city: "", dateLabel: "", color: "#FF6B6B" });

  const addDay = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/trips/${tripId}/days`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      setNewDay(false);
      setDayForm({ city: "", dateLabel: "", color: "#FF6B6B" });
      toast({ title: "Jour ajouté" });
    },
  });

  const handleAddDay = (e: React.FormEvent) => {
    e.preventDefault();
    const nextDay = (trip.days?.length || 0) + 1;
    addDay.mutate({ ...dayForm, dayNumber: nextDay, sortOrder: nextDay });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold font-display">Jours ({trip.days?.length || 0})</h3>
        <Button variant="outline" size="sm" onClick={() => setNewDay(!newDay)} data-testid="admin-button-add-day">
          <Plus className="w-3.5 h-3.5 mr-1" /> Jour
        </Button>
      </div>

      {newDay && (
        <form onSubmit={handleAddDay} className="bg-muted/50 rounded-md p-3 border border-border/50 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Ville</Label>
              <Input value={dayForm.city} onChange={e => setDayForm(p => ({...p, city: e.target.value}))} required data-testid="admin-input-day-city" />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input value={dayForm.dateLabel} onChange={e => setDayForm(p => ({...p, dateLabel: e.target.value}))} placeholder="15 Mars" required data-testid="admin-input-day-date" />
            </div>
            <div>
              <Label className="text-xs">Couleur</Label>
              <Input type="color" value={dayForm.color} onChange={e => setDayForm(p => ({...p, color: e.target.value}))} data-testid="admin-input-day-color" />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={addDay.isPending} data-testid="admin-button-save-day">
            {addDay.isPending ? "..." : "Ajouter"}
          </Button>
        </form>
      )}

      {trip.days?.map((day) => (
        <DayItem key={day.id} day={day} tripId={tripId} expanded={expandedDay === day.id} onToggle={() => setExpandedDay(expandedDay === day.id ? null : day.id)} />
      ))}
    </div>
  );
}

function DayItem({ day, tripId, expanded, onToggle }: { day: any, tripId: number, expanded: boolean, onToggle: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newActivity, setNewActivity] = useState(false);
  const [actForm, setActForm] = useState({ title: "", time: "10:00", type: "activity", cost: "0", note: "", latitude: "", longitude: "", googleMapsUrl: "", bookingUrl: "", address: "", checkoutTime: "", confirmationNumber: "", imageUrl: "", phone: "", rating: "", reviewCount: "", priceRange: "", nights: "" });
  const [newTip, setNewTip] = useState(false);
  const [tipContent, setTipContent] = useState("");
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [editActForm, setEditActForm] = useState({ title: "", time: "", type: "activity", cost: "0", note: "", latitude: "", longitude: "", googleMapsUrl: "", bookingUrl: "", address: "", checkoutTime: "", confirmationNumber: "", imageUrl: "", phone: "", rating: "", reviewCount: "", priceRange: "", nights: "" });
  const [editingTipId, setEditingTipId] = useState<number | null>(null);
  const [editTipContent, setEditTipContent] = useState("");
  const [editingDayHeader, setEditingDayHeader] = useState(false);
  const [dayHeaderForm, setDayHeaderForm] = useState({ city: day.city || "", dateLabel: day.dateLabel || "", color: day.color || "#FF6B6B" });
  const [budgetForm, setBudgetForm] = useState({
    hotel: day.budget?.hotel || "0",
    food: day.budget?.food || "0",
    transport: day.budget?.transport || "0",
    activities: day.budget?.activities || "0",
    other: day.budget?.other || "0",
  });

  const addTip = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/admin/days/${day.id}/tips`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, sortOrder: (day.tips?.length || 0) + 1 }), credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      setNewTip(false);
      setTipContent("");
      toast({ title: "Tip ajouté" });
    },
  });

  const deleteTip = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/tips/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
    },
  });

  const updateTip = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const res = await fetch(`/api/admin/tips/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }), credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      setEditingTipId(null);
      toast({ title: "Tip mis à jour" });
    },
  });

  const addActivity = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/days/${day.id}/activities`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      setNewActivity(false);
      setActForm({ title: "", time: "10:00", type: "activity", cost: "0", note: "", latitude: "", longitude: "", googleMapsUrl: "", bookingUrl: "", address: "", checkoutTime: "", confirmationNumber: "", imageUrl: "", phone: "", rating: "", reviewCount: "", priceRange: "", nights: "" });
      toast({ title: "Activité ajoutée" });
    },
  });

  const deleteActivity = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
    },
  });

  const updateActivity = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/activities/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      setEditingActivityId(null);
      toast({ title: "Activité mise à jour" });
    },
  });

  const deleteDay = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/days/${day.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      toast({ title: "Jour supprimé" });
    },
  });

  const updateDayHeader = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/days/${day.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      setEditingDayHeader(false);
      toast({ title: "Jour mis à jour" });
    },
  });

  const updateBudget = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/admin/days/${day.id}/budget`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      toast({ title: "Budget mis à jour" });
    },
  });

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { ...actForm, sortOrder: (day.activities?.length || 0) + 1 };
    if (actForm.latitude) data.latitude = parseFloat(actForm.latitude);
    if (actForm.longitude) data.longitude = parseFloat(actForm.longitude);
    if (!actForm.googleMapsUrl) delete data.googleMapsUrl;
    if (!actForm.bookingUrl) delete data.bookingUrl;
    if (!actForm.address) delete data.address;
    if (!actForm.checkoutTime) delete data.checkoutTime;
    if (!actForm.confirmationNumber) delete data.confirmationNumber;
    if (!actForm.imageUrl) delete data.imageUrl;
    if (!actForm.phone) delete data.phone;
    if (!actForm.rating) delete data.rating;
    if (!actForm.reviewCount) delete data.reviewCount;
    if (!actForm.priceRange) delete data.priceRange;
    if (actForm.nights) data.nights = parseInt(actForm.nights); else delete data.nights;
    addActivity.mutate(data);
  };

  const startEditActivity = (a: any) => {
    setEditingActivityId(a.id);
    setEditActForm({
      title: a.title || "",
      time: a.time || "10:00",
      type: a.type || "activity",
      cost: String(a.cost || "0"),
      note: a.note || "",
      latitude: a.latitude ? String(a.latitude) : "",
      longitude: a.longitude ? String(a.longitude) : "",
      googleMapsUrl: a.googleMapsUrl || "",
      bookingUrl: a.bookingUrl || "",
      address: a.address || "",
      checkoutTime: a.checkoutTime || "",
      confirmationNumber: a.confirmationNumber || "",
      imageUrl: a.imageUrl || "",
      phone: a.phone || "",
      rating: a.rating || "",
      reviewCount: a.reviewCount || "",
      priceRange: a.priceRange || "",
      nights: a.nights ? String(a.nights) : "",
    });
  };

  const handleEditActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivityId) return;
    const data: any = { ...editActForm };
    if (editActForm.latitude) data.latitude = parseFloat(editActForm.latitude);
    else data.latitude = null;
    if (editActForm.longitude) data.longitude = parseFloat(editActForm.longitude);
    else data.longitude = null;
    if (!editActForm.googleMapsUrl) data.googleMapsUrl = null;
    if (!editActForm.bookingUrl) data.bookingUrl = null;
    if (!editActForm.address) data.address = null;
    if (!editActForm.checkoutTime) data.checkoutTime = null;
    if (!editActForm.confirmationNumber) data.confirmationNumber = null;
    if (!editActForm.imageUrl) data.imageUrl = null;
    if (!editActForm.phone) data.phone = null;
    if (!editActForm.rating) data.rating = null;
    if (!editActForm.reviewCount) data.reviewCount = null;
    if (!editActForm.priceRange) data.priceRange = null;
    data.nights = editActForm.nights ? parseInt(editActForm.nights) : null;
    updateActivity.mutate({ id: editingActivityId, data });
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    updateBudget.mutate({
      hotel: Number(budgetForm.hotel) || 0,
      food: Number(budgetForm.food) || 0,
      transport: Number(budgetForm.transport) || 0,
      activities: Number(budgetForm.activities) || 0,
      other: Number(budgetForm.other) || 0,
    });
  };

  return (
    <div className="bg-card rounded-md border border-border/50 overflow-hidden">
      <div className="flex items-center">
        <button onClick={onToggle} className="flex-1 flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors" data-testid={`admin-day-toggle-${day.dayNumber}`}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: day.color || "#FF6B6B" }}>
            {day.dayNumber}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm">{day.city}</span>
            <span className="text-xs text-muted-foreground ml-2">{day.dateLabel}</span>
          </div>
          <Badge variant="secondary" className="text-xs">{day.activities?.length || 0} activités</Badge>
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingDayHeader(!editingDayHeader); }} data-testid={`admin-edit-day-${day.id}`}>
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); if (confirm("Supprimer ce jour ?")) deleteDay.mutate(); }} data-testid={`admin-delete-day-${day.id}`}>
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </div>

      {editingDayHeader && (
        <form onSubmit={(e) => { e.preventDefault(); updateDayHeader.mutate(dayHeaderForm); }} className="border-t border-border/30 p-3 bg-muted/50 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Ville</Label>
              <Input value={dayHeaderForm.city} onChange={e => setDayHeaderForm(p => ({...p, city: e.target.value}))} required data-testid={`admin-input-edit-day-city-${day.id}`} />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input value={dayHeaderForm.dateLabel} onChange={e => setDayHeaderForm(p => ({...p, dateLabel: e.target.value}))} required data-testid={`admin-input-edit-day-date-${day.id}`} />
            </div>
            <div>
              <Label className="text-xs">Couleur</Label>
              <Input type="color" value={dayHeaderForm.color} onChange={e => setDayHeaderForm(p => ({...p, color: e.target.value}))} data-testid={`admin-input-edit-day-color-${day.id}`} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={updateDayHeader.isPending}>
              {updateDayHeader.isPending ? "..." : "Enregistrer"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingDayHeader(false)}>Annuler</Button>
          </div>
        </form>
      )}

      {expanded && (
        <div className="border-t border-border/30 p-3 space-y-2">
          {day.activities?.map((a: any) => (
            editingActivityId === a.id ? (
              <form key={a.id} onSubmit={handleEditActivity} className="space-y-2 bg-muted/50 rounded-md p-3 border border-border/50" data-testid={`admin-edit-activity-${a.id}`}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Titre</Label>
                    <Input value={editActForm.title} onChange={e => setEditActForm(p => ({...p, title: e.target.value}))} required />
                  </div>
                  <div>
                    <Label className="text-xs">Heure</Label>
                    <Input type="time" value={editActForm.time} onChange={e => setEditActForm(p => ({...p, time: e.target.value}))} />
                  </div>
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={editActForm.type} onValueChange={v => setEditActForm(p => ({...p, type: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activity">Activité</SelectItem>
                        <SelectItem value="food">Restaurant</SelectItem>
                        <SelectItem value="transport">Transport</SelectItem>
                        <SelectItem value="hotel">Hôtel</SelectItem>
                        <SelectItem value="shopping">Shopping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Co\u00fbt ({"\u20ac"})</Label>
                    <Input type="number" value={editActForm.cost} onChange={e => setEditActForm(p => ({...p, cost: e.target.value}))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Note</Label>
                  <Input value={editActForm.note} onChange={e => setEditActForm(p => ({...p, note: e.target.value}))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Latitude</Label>
                    <Input value={editActForm.latitude} onChange={e => setEditActForm(p => ({...p, latitude: e.target.value}))} placeholder="ex: 13.7465" />
                  </div>
                  <div>
                    <Label className="text-xs">Longitude</Label>
                    <Input value={editActForm.longitude} onChange={e => setEditActForm(p => ({...p, longitude: e.target.value}))} placeholder="ex: 100.4930" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Lien Google Maps</Label>
                  <Input value={editActForm.googleMapsUrl} onChange={e => setEditActForm(p => ({...p, googleMapsUrl: e.target.value}))} placeholder="https://www.google.com/maps/place/..." />
                </div>
                <div>
                  <Label className="text-xs">Lien réservation</Label>
                  <Input value={editActForm.bookingUrl} onChange={e => setEditActForm(p => ({...p, bookingUrl: e.target.value}))} placeholder="https://..." />
                </div>
                {editActForm.type === "hotel" && (
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <Hotel className="w-3.5 h-3.5" />
                      Détails hébergement
                    </p>
                    <div>
                      <Label className="text-xs">Adresse</Label>
                      <Input value={editActForm.address} onChange={e => setEditActForm(p => ({...p, address: e.target.value}))} placeholder="Adresse complète de l'hôtel" data-testid="admin-edit-hotel-address" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Check-in (heure existante)</Label>
                        <Input type="time" value={editActForm.time} onChange={e => setEditActForm(p => ({...p, time: e.target.value}))} />
                      </div>
                      <div>
                        <Label className="text-xs">Check-out</Label>
                        <Input type="time" value={editActForm.checkoutTime} onChange={e => setEditActForm(p => ({...p, checkoutTime: e.target.value}))} placeholder="11:00" data-testid="admin-edit-hotel-checkout" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">N{"\u00b0"} de confirmation</Label>
                      <Input value={editActForm.confirmationNumber} onChange={e => setEditActForm(p => ({...p, confirmationNumber: e.target.value}))} placeholder="Ex: ABC123XYZ" data-testid="admin-edit-hotel-confirmation" />
                    </div>
                    <div>
                      <Label className="text-xs">Téléphone</Label>
                      <Input value={editActForm.phone} onChange={e => setEditActForm(p => ({...p, phone: e.target.value}))} placeholder="+66 2 123 4567" data-testid="admin-edit-hotel-phone" />
                    </div>
                    <div>
                      <Label className="text-xs">Nombre de nuits</Label>
                      <Input type="number" value={editActForm.nights} onChange={e => setEditActForm(p => ({...p, nights: e.target.value}))} placeholder="1" data-testid="admin-edit-hotel-nights" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Note / Étoiles</Label>
                        <Input value={editActForm.rating} onChange={e => setEditActForm(p => ({...p, rating: e.target.value}))} placeholder="4.2" data-testid="admin-edit-hotel-rating" />
                      </div>
                      <div>
                        <Label className="text-xs">Nombre d'avis</Label>
                        <Input value={editActForm.reviewCount} onChange={e => setEditActForm(p => ({...p, reviewCount: e.target.value}))} placeholder="4080 avis" data-testid="admin-edit-hotel-reviews" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Fourchette de prix</Label>
                      <Input value={editActForm.priceRange} onChange={e => setEditActForm(p => ({...p, priceRange: e.target.value}))} placeholder="~150-250€/nuit" data-testid="admin-edit-hotel-price" />
                    </div>
                    <div>
                      <Label className="text-xs">Photo URL</Label>
                      <Input value={editActForm.imageUrl} onChange={e => setEditActForm(p => ({...p, imageUrl: e.target.value}))} placeholder="https://... (URL de la photo)" data-testid="admin-edit-hotel-image" />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={updateActivity.isPending}>
                    {updateActivity.isPending ? "..." : "Enregistrer"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditingActivityId(null)}>Annuler</Button>
                </div>
              </form>
            ) : (
              <div key={a.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-sm cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => startEditActivity(a)} data-testid={`admin-activity-${a.id}`}>
                <span className="text-xs font-mono text-muted-foreground w-12">{a.time}</span>
                <Badge variant="secondary" className="text-[10px]">{a.type}</Badge>
                <span className="flex-1 truncate">{a.title}</span>
                {parseFloat(a.cost) > 0 && <span className="text-xs text-muted-foreground">{a.cost}{"\u20ac"}</span>}
                {a.googleMapsUrl && (
                  <a href={a.googleMapsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                    <MapIcon className="w-3 h-3 text-blue-500" />
                  </a>
                )}
                {a.latitude && <MapPin className="w-3 h-3 text-muted-foreground" />}
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); startEditActivity(a); }} data-testid={`admin-edit-activity-${a.id}`}>
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteActivity.mutate(a.id); }} data-testid={`admin-delete-activity-${a.id}`}>
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            )
          ))}

          <div className="border-t border-border/30 pt-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Tips du jour</h4>
              <Button variant="outline" size="sm" onClick={() => setNewTip(!newTip)} className="text-xs" data-testid={`admin-button-add-tip-${day.dayNumber}`}>
                <Plus className="w-3 h-3 mr-1" /> Tip
              </Button>
            </div>
            {day.tips?.map((tip: any) => (
              <div key={tip.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/30 text-sm mb-1" data-testid={`admin-tip-${tip.id}`}>
                <Lightbulb className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                {editingTipId === tip.id ? (
                  <Input
                    autoFocus
                    value={editTipContent}
                    onChange={e => setEditTipContent(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") { e.preventDefault(); if (editTipContent.trim()) updateTip.mutate({ id: tip.id, content: editTipContent.trim() }); }
                      if (e.key === "Escape") setEditingTipId(null);
                    }}
                    onBlur={() => { if (editTipContent.trim()) updateTip.mutate({ id: tip.id, content: editTipContent.trim() }); else setEditingTipId(null); }}
                    className="flex-1 text-xs"
                    data-testid={`admin-edit-tip-${tip.id}`}
                  />
                ) : (
                  <span className="flex-1 text-xs cursor-pointer hover:underline" onClick={() => { setEditingTipId(tip.id); setEditTipContent(tip.content); }} data-testid={`admin-edit-tip-${tip.id}`}>{tip.content}</span>
                )}
                <Button variant="ghost" size="icon" onClick={() => deleteTip.mutate(tip.id)} data-testid={`admin-delete-tip-${tip.id}`}>
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {newTip && (
              <form onSubmit={(e) => { e.preventDefault(); if (tipContent.trim()) addTip.mutate(tipContent.trim()); }} className="flex gap-2 mt-2">
                <Input
                  value={tipContent}
                  onChange={e => setTipContent(e.target.value)}
                  placeholder="Ex: Prenez le BTS pour vous déplacer rapidement"
                  className="flex-1 text-xs"
                  data-testid="admin-input-tip-content"
                />
                <Button type="submit" size="sm" disabled={addTip.isPending} data-testid="admin-button-save-tip">
                  {addTip.isPending ? "..." : "OK"}
                </Button>
              </form>
            )}
          </div>

          <div className="border-t border-border/30 pt-3 mt-3">
            <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">Budget du jour</h4>
            <form onSubmit={handleSaveBudget} className="space-y-2">
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <Label className="text-xs">Hôtel</Label>
                  <Input type="number" value={budgetForm.hotel} onChange={e => setBudgetForm(p => ({...p, hotel: e.target.value}))} data-testid={`admin-input-budget-hotel-${day.id}`} />
                </div>
                <div>
                  <Label className="text-xs">Repas</Label>
                  <Input type="number" value={budgetForm.food} onChange={e => setBudgetForm(p => ({...p, food: e.target.value}))} data-testid={`admin-input-budget-food-${day.id}`} />
                </div>
                <div>
                  <Label className="text-xs">Transport</Label>
                  <Input type="number" value={budgetForm.transport} onChange={e => setBudgetForm(p => ({...p, transport: e.target.value}))} data-testid={`admin-input-budget-transport-${day.id}`} />
                </div>
                <div>
                  <Label className="text-xs">Activités</Label>
                  <Input type="number" value={budgetForm.activities} onChange={e => setBudgetForm(p => ({...p, activities: e.target.value}))} data-testid={`admin-input-budget-activities-${day.id}`} />
                </div>
                <div>
                  <Label className="text-xs">Autre</Label>
                  <Input type="number" value={budgetForm.other} onChange={e => setBudgetForm(p => ({...p, other: e.target.value}))} data-testid={`admin-input-budget-other-${day.id}`} />
                </div>
              </div>
              <Button type="submit" size="sm" disabled={updateBudget.isPending}>
                {updateBudget.isPending ? "..." : "Enregistrer le budget"}
              </Button>
            </form>
          </div>

          {!newActivity ? (
            <Button variant="outline" size="sm" onClick={() => setNewActivity(true)} className="w-full border-dashed text-xs" data-testid={`admin-button-add-activity-${day.dayNumber}`}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter une activité
            </Button>
          ) : (
            <form onSubmit={handleAddActivity} className="space-y-2 bg-muted/50 rounded-md p-3 border border-border/50">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Titre</Label>
                  <Input value={actForm.title} onChange={e => setActForm(p => ({...p, title: e.target.value}))} required data-testid="admin-input-activity-title" />
                </div>
                <div>
                  <Label className="text-xs">Heure</Label>
                  <Input type="time" value={actForm.time} onChange={e => setActForm(p => ({...p, time: e.target.value}))} data-testid="admin-input-activity-time" />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={actForm.type} onValueChange={v => setActForm(p => ({...p, type: v}))}>
                    <SelectTrigger data-testid="admin-select-activity-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activity">Activité</SelectItem>
                      <SelectItem value="food">Restaurant</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="hotel">Hôtel</SelectItem>
                      <SelectItem value="shopping">Shopping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Co\u00fbt ({"\u20ac"})</Label>
                  <Input type="number" value={actForm.cost} onChange={e => setActForm(p => ({...p, cost: e.target.value}))} data-testid="admin-input-activity-cost" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Note</Label>
                <Input value={actForm.note} onChange={e => setActForm(p => ({...p, note: e.target.value}))} data-testid="admin-input-activity-note" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Latitude</Label>
                  <Input value={actForm.latitude} onChange={e => setActForm(p => ({...p, latitude: e.target.value}))} placeholder="ex: 13.7465" data-testid="admin-input-activity-lat" />
                </div>
                <div>
                  <Label className="text-xs">Longitude</Label>
                  <Input value={actForm.longitude} onChange={e => setActForm(p => ({...p, longitude: e.target.value}))} placeholder="ex: 100.4930" data-testid="admin-input-activity-lng" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Lien Google Maps</Label>
                <Input value={actForm.googleMapsUrl} onChange={e => setActForm(p => ({...p, googleMapsUrl: e.target.value}))} placeholder="https://www.google.com/maps/place/..." data-testid="admin-input-activity-gmaps" />
              </div>
              <div>
                <Label className="text-xs">Lien réservation</Label>
                <Input value={actForm.bookingUrl} onChange={e => setActForm(p => ({...p, bookingUrl: e.target.value}))} placeholder="https://..." data-testid="admin-input-activity-booking" />
              </div>
              {actForm.type === "hotel" && (
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                    <Hotel className="w-3.5 h-3.5" />
                    Détails hébergement
                  </p>
                  <div>
                    <Label className="text-xs">Adresse</Label>
                    <Input value={actForm.address} onChange={e => setActForm(p => ({...p, address: e.target.value}))} placeholder="Adresse complète de l'hôtel" data-testid="admin-input-hotel-address" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Check-in (heure ci-dessus)</Label>
                      <Input type="time" value={actForm.time} onChange={e => setActForm(p => ({...p, time: e.target.value}))} />
                    </div>
                    <div>
                      <Label className="text-xs">Check-out</Label>
                      <Input type="time" value={actForm.checkoutTime} onChange={e => setActForm(p => ({...p, checkoutTime: e.target.value}))} placeholder="11:00" data-testid="admin-input-hotel-checkout" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">N{"\u00b0"} de confirmation</Label>
                    <Input value={actForm.confirmationNumber} onChange={e => setActForm(p => ({...p, confirmationNumber: e.target.value}))} placeholder="Ex: ABC123XYZ" data-testid="admin-input-hotel-confirmation" />
                  </div>
                  <div>
                    <Label className="text-xs">Téléphone</Label>
                    <Input value={actForm.phone} onChange={e => setActForm(p => ({...p, phone: e.target.value}))} placeholder="+66 2 123 4567" data-testid="admin-input-hotel-phone" />
                  </div>
                  <div>
                    <Label className="text-xs">Nombre de nuits</Label>
                    <Input type="number" value={actForm.nights} onChange={e => setActForm(p => ({...p, nights: e.target.value}))} placeholder="1" data-testid="admin-input-hotel-nights" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Note / Étoiles</Label>
                      <Input value={actForm.rating} onChange={e => setActForm(p => ({...p, rating: e.target.value}))} placeholder="4.2" data-testid="admin-input-hotel-rating" />
                    </div>
                    <div>
                      <Label className="text-xs">Nombre d'avis</Label>
                      <Input value={actForm.reviewCount} onChange={e => setActForm(p => ({...p, reviewCount: e.target.value}))} placeholder="4080 avis" data-testid="admin-input-hotel-reviews" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Fourchette de prix</Label>
                    <Input value={actForm.priceRange} onChange={e => setActForm(p => ({...p, priceRange: e.target.value}))} placeholder="~150-250€/nuit" data-testid="admin-input-hotel-price" />
                  </div>
                  <div>
                    <Label className="text-xs">Photo URL</Label>
                    <Input value={actForm.imageUrl} onChange={e => setActForm(p => ({...p, imageUrl: e.target.value}))} placeholder="https://... (URL de la photo)" data-testid="admin-input-hotel-image" />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={addActivity.isPending} data-testid="admin-button-save-activity">
                  {addActivity.isPending ? "..." : "Ajouter"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setNewActivity(false)}>Annuler</Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

const ADMIN_PHASE_OPTIONS = [
  { value: "before", label: "Bien avant le départ" },
  { value: "week", label: "La semaine avant" },
  { value: "pack", label: "Dans la valise" },
];

const ADMIN_SUBCATEGORY_OPTIONS = [
  { value: "essentiels", label: "Essentiels" },
  { value: "vetements", label: "Vêtements" },
  { value: "toilette", label: "Toilette & Santé" },
  { value: "tech", label: "Tech & Connectivité" },
  { value: "confort", label: "Confort voyage" },
];

const PHASE_LABELS: Record<string, string> = { before: "Avant", week: "Semaine", pack: "Valise" };
const SUBCAT_LABELS: Record<string, string> = { essentiels: "Essentiels", vetements: "Vêtements", toilette: "Toilette", tech: "Tech", confort: "Confort" };

function getInternationalTemplate() {
  return [
    { text: "Vérifier la validité du passeport", hint: "Doit être valide 6 mois après la date de retour", isCritical: true, phase: "before", category: "Documents", sortOrder: 1 },
    { text: "Vérifier les conditions de visa", hint: "Selon la destination et la durée du séjour", isCritical: false, phase: "before", category: "Documents", sortOrder: 2 },
    { text: "Souscrire une assurance voyage", isCritical: true, phase: "before", category: "Documents", sortOrder: 3 },
    { text: "Photocopier les documents importants", hint: "Passeport, billets, assurance \u2014 garder une copie numérique", isCritical: false, phase: "before", category: "Documents", sortOrder: 4 },
    { text: "Prévenir sa banque", hint: "Activer l\u2019option paiement à l\u2019étranger", isCritical: false, phase: "before", category: "Finance", sortOrder: 5 },
    { text: "Vérifier les vaccins recommandés", isCritical: true, phase: "before", category: "Santé", sortOrder: 6 },
    { text: "Réserver les activités à forte demande", isCritical: false, phase: "before", category: "Autre", sortOrder: 7 },
    { text: "Faire l\u2019enregistrement en ligne", hint: "Ouvre généralement 24-48h avant le vol", isCritical: false, phase: "week", category: "Documents", sortOrder: 8 },
    { text: "Télécharger les cartes offline Google Maps", hint: "Indispensable en cas de mauvaise connexion", isCritical: false, phase: "week", category: "Tech", sortOrder: 9 },
    { text: "Acheter une eSIM ou carte SIM locale", isCritical: false, phase: "week", category: "Tech", sortOrder: 10 },
    { text: "Télécharger les billets / boarding pass", isCritical: false, phase: "week", category: "Documents", sortOrder: 11 },
    { text: "Vérifier toutes les confirmations de réservation", isCritical: false, phase: "week", category: "Documents", sortOrder: 12 },
    { text: "Préparer une trousse de pharmacie de base", hint: "Doliprane, pansements, anti-diarrhéique, antihistaminique", isCritical: false, phase: "week", category: "Santé", sortOrder: 13 },
    { text: "Mettre à jour ses contacts d\u2019urgence", isCritical: false, phase: "week", category: "Autre", sortOrder: 14 },
    { text: "Vérifier la météo de la destination", isCritical: false, phase: "week", category: "Autre", sortOrder: 15 },
    { text: "Passeport", isCritical: true, phase: "pack", subcategory: "essentiels", category: "Documents", sortOrder: 16 },
    { text: "Billets d\u2019avion / boarding pass", isCritical: true, phase: "pack", subcategory: "essentiels", category: "Documents", sortOrder: 17 },
    { text: "Confirmations d\u2019hôtel imprimées", isCritical: false, phase: "pack", subcategory: "essentiels", category: "Documents", sortOrder: 18 },
    { text: "Assurance voyage (copie)", isCritical: false, phase: "pack", subcategory: "essentiels", category: "Documents", sortOrder: 19 },
    { text: "Carte bancaire + copie", isCritical: true, phase: "pack", subcategory: "essentiels", category: "Finance", sortOrder: 20 },
    { text: "Argent liquide en devise locale", isCritical: false, phase: "pack", subcategory: "essentiels", category: "Finance", sortOrder: 21 },
    { text: "Médicaments personnels", isCritical: true, phase: "pack", subcategory: "essentiels", category: "Santé", sortOrder: 22 },
    { text: "Chargeur de téléphone", isCritical: true, phase: "pack", subcategory: "tech", category: "Tech", sortOrder: 23 },
    { text: "Adaptateur de prise", hint: "Type de prise selon destination", isCritical: false, phase: "pack", subcategory: "tech", category: "Tech", sortOrder: 24 },
    { text: "Batterie externe / power bank", isCritical: false, phase: "pack", subcategory: "tech", category: "Tech", sortOrder: 25 },
    { text: "Écouteurs", isCritical: false, phase: "pack", subcategory: "tech", category: "Tech", sortOrder: 26 },
    { text: "Vêtements pour la durée du séjour", hint: "Adaptés au climat de la destination", isCritical: false, phase: "pack", subcategory: "vetements", category: "Vêtements", sortOrder: 27 },
    { text: "Sous-vêtements", isCritical: false, phase: "pack", subcategory: "vetements", category: "Vêtements", sortOrder: 28 },
    { text: "Pyjama", isCritical: false, phase: "pack", subcategory: "vetements", category: "Vêtements", sortOrder: 29 },
    { text: "Veste / couche supplémentaire", isCritical: false, phase: "pack", subcategory: "vetements", category: "Vêtements", sortOrder: 30 },
    { text: "Chaussures de marche confortables", isCritical: false, phase: "pack", subcategory: "vetements", category: "Vêtements", sortOrder: 31 },
    { text: "Tenue habillée", hint: "Si restaurant ou sortie prévue", isCritical: false, phase: "pack", subcategory: "vetements", category: "Vêtements", sortOrder: 32 },
    { text: "Brosse à dents + dentifrice", isCritical: false, phase: "pack", subcategory: "toilette", category: "Santé", sortOrder: 33 },
    { text: "Crème solaire", isCritical: false, phase: "pack", subcategory: "toilette", category: "Santé", sortOrder: 34 },
    { text: "Shampooing / gel douche (format voyage)", isCritical: false, phase: "pack", subcategory: "toilette", category: "Santé", sortOrder: 35 },
    { text: "Déodorant", isCritical: false, phase: "pack", subcategory: "toilette", category: "Santé", sortOrder: 36 },
    { text: "Trousse de pharmacie", isCritical: false, phase: "pack", subcategory: "toilette", category: "Santé", sortOrder: 37 },
    { text: "Masque de sommeil", isCritical: false, phase: "pack", subcategory: "confort", category: "Autre", sortOrder: 38 },
    { text: "Boules Quies / bouchons d\u2019oreilles", isCritical: false, phase: "pack", subcategory: "confort", category: "Autre", sortOrder: 39 },
    { text: "Coussin de nuque", hint: "Si vol long-courrier", isCritical: false, phase: "pack", subcategory: "confort", category: "Autre", sortOrder: 40 },
    { text: "Sac plastique pour linge sale", isCritical: false, phase: "pack", subcategory: "confort", category: "Autre", sortOrder: 41 },
    { text: "Cadenas pour valise", isCritical: false, phase: "pack", subcategory: "confort", category: "Autre", sortOrder: 42 },
  ];
}

function getWeekendTemplate() {
  return [
    { text: "Vérifier les documents d\u2019identité", isCritical: true, phase: "before", category: "Documents", sortOrder: 1 },
    { text: "Confirmer les réservations", isCritical: false, phase: "before", category: "Documents", sortOrder: 2 },
    { text: "Vérifier la météo", isCritical: false, phase: "week", category: "Autre", sortOrder: 3 },
    { text: "Télécharger les cartes offline", isCritical: false, phase: "week", category: "Tech", sortOrder: 4 },
    { text: "Préparer un petit sac de pharmacie", hint: "Doliprane, pansements", isCritical: false, phase: "week", category: "Santé", sortOrder: 5 },
    { text: "Carte d\u2019identité / passeport", isCritical: true, phase: "pack", subcategory: "essentiels", category: "Documents", sortOrder: 6 },
    { text: "Carte bancaire + espèces", isCritical: true, phase: "pack", subcategory: "essentiels", category: "Finance", sortOrder: 7 },
    { text: "Chargeur de téléphone", isCritical: true, phase: "pack", subcategory: "tech", category: "Tech", sortOrder: 8 },
    { text: "Vêtements pour 2-3 jours", isCritical: false, phase: "pack", subcategory: "vetements", category: "Vêtements", sortOrder: 9 },
    { text: "Sous-vêtements", isCritical: false, phase: "pack", subcategory: "vetements", category: "Vêtements", sortOrder: 10 },
    { text: "Veste légère", isCritical: false, phase: "pack", subcategory: "vetements", category: "Vêtements", sortOrder: 11 },
    { text: "Trousse de toilette", isCritical: false, phase: "pack", subcategory: "toilette", category: "Santé", sortOrder: 12 },
    { text: "Crème solaire", isCritical: false, phase: "pack", subcategory: "toilette", category: "Santé", sortOrder: 13 },
    { text: "Bouteille d\u2019eau réutilisable", isCritical: false, phase: "pack", subcategory: "confort", category: "Autre", sortOrder: 14 },
    { text: "Écouteurs", isCritical: false, phase: "pack", subcategory: "tech", category: "Tech", sortOrder: 15 },
  ];
}

function ChecklistEditor({ tripId, trip }: { tripId: number, trip: TripWithDetails }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [category, setCategory] = useState("Documents");
  const [isCritical, setIsCritical] = useState(false);
  const [phase, setPhase] = useState("pack");
  const [subcategory, setSubcategory] = useState("");
  const [hint, setHint] = useState("");
  const [link, setLink] = useState("");
  const [editingChecklistId, setEditingChecklistId] = useState<number | null>(null);
  const [editCheckForm, setEditCheckForm] = useState({ text: "", category: "Documents", isCritical: false, phase: "pack", subcategory: "", hint: "", link: "" });
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  const addItem = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/trips/${tripId}/checklist`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      setText(""); setHint(""); setLink("");
      toast({ title: "Élément ajouté à la check-list" });
    },
  });

  const bulkAdd = useMutation({
    mutationFn: async (items: any[]) => {
      const res = await fetch(`/api/admin/trips/${tripId}/checklist/bulk`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }), credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      setShowTemplateDialog(false);
      toast({ title: `${data.length} éléments ajoutés à la check-list` });
    },
  });

  const updateChecklistItem = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/admin/checklist/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      setEditingChecklistId(null);
      toast({ title: "Élément mis à jour" });
    },
  });

  const deleteChecklistItem = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/checklist/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      toast({ title: "Élément supprimé" });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addItem.mutate({
      text, category, isCritical, phase,
      subcategory: phase === "pack" && subcategory ? subcategory : undefined,
      hint: hint.trim() || undefined,
      link: link.trim() || undefined,
    });
  };

  const startEditChecklist = (item: any) => {
    setEditingChecklistId(item.id);
    setEditCheckForm({
      text: item.text || "", category: item.category || "Autre", isCritical: !!item.isCritical,
      phase: item.phase || "pack", subcategory: item.subcategory || "", hint: item.hint || "", link: item.link || "",
    });
  };

  const handleSaveChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChecklistId) return;
    updateChecklistItem.mutate({
      id: editingChecklistId,
      data: {
        ...editCheckForm,
        subcategory: editCheckForm.phase === "pack" && editCheckForm.subcategory ? editCheckForm.subcategory : null,
        hint: editCheckForm.hint.trim() || null,
        link: editCheckForm.link.trim() || null,
      },
    });
  };

  const allItems = trip.checklistItems || [];
  const phaseGroups = {
    before: allItems.filter((i: any) => i.phase === "before"),
    week: allItems.filter((i: any) => i.phase === "week"),
    pack: allItems.filter((i: any) => !i.phase || i.phase === "pack"),
  };

  const renderItemForm = (form: any, setForm: (fn: (prev: any) => any) => void, isEdit: boolean) => (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Texte</Label>
          <Input value={form.text} onChange={e => setForm(p => ({...p, text: e.target.value}))} required data-testid={isEdit ? undefined : "admin-input-checklist-text"} />
        </div>
        <div>
          <Label className="text-xs">Phase</Label>
          <Select value={form.phase} onValueChange={v => setForm(p => ({...p, phase: v, subcategory: v === "pack" ? p.subcategory : ""}))}>
            <SelectTrigger data-testid={isEdit ? undefined : "admin-select-checklist-phase"}><SelectValue /></SelectTrigger>
            <SelectContent>
              {ADMIN_PHASE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {form.phase === "pack" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Sous-catégorie valise</Label>
            <Select value={form.subcategory || "none"} onValueChange={v => setForm(p => ({...p, subcategory: v === "none" ? "" : v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                {ADMIN_SUBCATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Catégorie</Label>
            <Select value={form.category} onValueChange={v => setForm(p => ({...p, category: v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Documents">Documents</SelectItem>
                <SelectItem value="Santé">Santé</SelectItem>
                <SelectItem value="Tech">Tech</SelectItem>
                <SelectItem value="Vêtements">Vêtements</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      {form.phase !== "pack" && (
        <div>
          <Label className="text-xs">Catégorie</Label>
          <Select value={form.category} onValueChange={v => setForm(p => ({...p, category: v}))}>
            <SelectTrigger data-testid={isEdit ? undefined : "admin-select-checklist-category"}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Documents">Documents</SelectItem>
              <SelectItem value="Santé">Santé</SelectItem>
              <SelectItem value="Tech">Tech</SelectItem>
              <SelectItem value="Vêtements">Vêtements</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
              <SelectItem value="Autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label className="text-xs">Conseil (optionnel)</Label>
        <Input value={form.hint} onChange={e => setForm(p => ({...p, hint: e.target.value}))} placeholder="Info contextuelle (max 120 car.)" maxLength={120} />
      </div>
      <div>
        <Label className="text-xs">Lien (optionnel)</Label>
        <Input value={form.link} onChange={e => setForm(p => ({...p, link: e.target.value}))} placeholder="https://..." type="url" />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox checked={form.isCritical} onCheckedChange={(v) => setForm(p => ({...p, isCritical: v as boolean}))} data-testid={isEdit ? undefined : "admin-checkbox-critical"} />
        <Label className="text-xs">Critique / Important</Label>
      </div>
    </>
  );

  const renderPhaseSection = (phaseKey: string, label: string, items: any[]) => {
    if (items.length === 0) return null;
    return (
      <div key={phaseKey}>
        <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${phaseKey === "before" ? "bg-blue-500" : phaseKey === "week" ? "bg-amber-500" : "bg-emerald-500"}`} />
          {label} ({items.length})
        </h4>
        <div className="space-y-1">
          {items.map((item: any) => (
            editingChecklistId === item.id ? (
              <form key={item.id} onSubmit={handleSaveChecklist} className="bg-muted/50 rounded-md p-3 border border-border/50 space-y-2" data-testid={`admin-edit-checklist-${item.id}`}>
                {renderItemForm(editCheckForm, setEditCheckForm, true)}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={updateChecklistItem.isPending}>
                    {updateChecklistItem.isPending ? "..." : "Enregistrer"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditingChecklistId(null)}>Annuler</Button>
                </div>
              </form>
            ) : (
              <div key={item.id} className="flex items-center gap-2 p-1.5 text-sm rounded-md bg-card border border-border/30" data-testid={`admin-checklist-item-${item.id}`}>
                <div className="flex-1 min-w-0">
                  <span>{item.text}</span>
                  {item.hint && <span className="text-xs text-muted-foreground ml-2">({item.hint})</span>}
                  {item.subcategory && <Badge variant="secondary" className="ml-2 text-[9px] px-1 py-0">{SUBCAT_LABELS[item.subcategory] || item.subcategory}</Badge>}
                </div>
                {item.isCritical && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">!</Badge>}
                {item.link && <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />}
                <Button variant="ghost" size="icon" onClick={() => startEditChecklist(item)} data-testid={`admin-edit-checklist-btn-${item.id}`}>
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteChecklistItem.mutate(item.id)} data-testid={`admin-delete-checklist-${item.id}`}>
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            )
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-base font-bold font-display">Check-list ({allItems.length})</h3>
        <Button variant="outline" size="sm" onClick={() => setShowTemplateDialog(true)} data-testid="admin-button-generate-checklist">
          <Wand2 className="w-3.5 h-3.5 mr-1" /> Générer checklist type
        </Button>
      </div>

      {showTemplateDialog && (
        <Card className="p-4 space-y-3" data-testid="template-dialog">
          <h4 className="text-sm font-bold">Choisir un modèle de checklist</h4>
          {allItems.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Les éléments seront ajoutés à la checklist existante ({allItems.length} items).</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => bulkAdd.mutate(getInternationalTemplate())}
              disabled={bulkAdd.isPending}
              data-testid="template-international"
            >
              <Plane className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-bold">Voyage international</span>
              <span className="text-[10px] text-muted-foreground">~42 items</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => bulkAdd.mutate(getWeekendTemplate())}
              disabled={bulkAdd.isPending}
              data-testid="template-weekend"
            >
              <Calendar className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-bold">Week-end / court séjour</span>
              <span className="text-[10px] text-muted-foreground">~15 items</span>
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowTemplateDialog(false)}>Annuler</Button>
        </Card>
      )}

      <form onSubmit={handleAdd} className="bg-muted/50 rounded-md p-3 border border-border/50 space-y-2">
        {renderItemForm({ text, category, isCritical, phase, subcategory, hint, link }, (fn) => {
          const next = fn({ text, category, isCritical, phase, subcategory, hint, link });
          setText(next.text); setCategory(next.category); setIsCritical(next.isCritical);
          setPhase(next.phase); setSubcategory(next.subcategory); setHint(next.hint); setLink(next.link);
        }, false)}
        <Button type="submit" size="sm" disabled={addItem.isPending} data-testid="admin-button-add-checklist">
          <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter
        </Button>
      </form>

      {renderPhaseSection("before", "Bien avant le départ", phaseGroups.before)}
      {renderPhaseSection("week", "La semaine avant", phaseGroups.week)}
      {renderPhaseSection("pack", "Dans la valise", phaseGroups.pack)}
    </div>
  );
}

function GuideUploader({ tripId, currentGuideUrl }: { tripId: number, currentGuideUrl: string | null }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: async (response) => {
      const res = await fetch(`/api/admin/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideUrl: response.objectPath }),
        credentials: "include",
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
        toast({ title: "Guide PDF ajouté avec succès" });
      }
    },
    onError: () => toast({ title: "Erreur lors de l'upload", variant: "destructive" }),
  });

  const removeGuide = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideUrl: null }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      toast({ title: "Guide supprimé" });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ title: "Seuls les fichiers PDF sont acceptés", variant: "destructive" });
        return;
      }
      await uploadFile(file);
    }
  };

  return (
    <div className="bg-muted/50 rounded-md p-4 border border-border/50">
      <Label className="text-base font-bold flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Guide PDF
      </Label>
      <p className="text-xs text-muted-foreground mb-3">Téléchargez un guide PDF que vos clients pourront télécharger</p>

      {currentGuideUrl ? (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1.5">
            <FileText className="w-3 h-3" />
            Guide PDF attaché
          </Badge>
          <a href={currentGuideUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" data-testid="admin-button-view-guide">
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> Voir
            </Button>
          </a>
          <Button variant="outline" size="sm" onClick={() => removeGuide.mutate()} disabled={removeGuide.isPending} data-testid="admin-button-remove-guide">
            <X className="w-3.5 h-3.5 mr-1" /> Supprimer
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading} data-testid="admin-button-replace-guide">
            <Upload className="w-3.5 h-3.5 mr-1" /> Remplacer
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} data-testid="admin-button-upload-guide">
          {isUploading ? (
            <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Upload en cours ({progress}%)</>
          ) : (
            <><Upload className="w-4 h-4 mr-1" /> Ajouter un guide PDF</>
          )}
        </Button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
        data-testid="admin-input-guide-file"
      />
    </div>
  );
}

function TripEditor({ tripId }: { tripId: number }) {
  const { data: trip, isLoading } = useAdminTrip(tripId);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { uploadFile } = useUpload();

  const [voyageForm, setVoyageForm] = useState<any>({});
  const [participantNames, setParticipantNames] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState("");
  const [budgetForm, setBudgetForm] = useState<any>({});
  const [clientEmails, setClientEmails] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [apparenceForm, setApparenceForm] = useState<any>({});
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [travelInfo, setTravelInfo] = useState<any>({});
  const [sendingEmail, setSendingEmail] = useState(false);

  const initSection = (section: string) => {
    if (!trip) return;
    switch (section) {
      case "voyage":
        setVoyageForm({
          title: trip.title || "", origin: trip.origin || "", destination: trip.destination || "",
          subtitle: trip.subtitle || "", coverEmoji: trip.coverEmoji || "", status: trip.status || "draft",
          departureDate: trip.departureDate ? String(trip.departureDate).split("T")[0] : "",
          returnDate: trip.returnDate ? String(trip.returnDate).split("T")[0] : "",
          travelers: String(trip.travelers || 2), currency: trip.currency || "€",
        });
        break;
      case "participants":
        setParticipantNames(trip.participants || []);
        setNewParticipant("");
        setClientEmails(trip.assignedToEmail || "");
        break;
      case "budget":
        setBudgetForm({
          budgetHotel: String(trip.budgetHotel || 0), budgetFood: String(trip.budgetFood || 0),
          budgetTransport: String(trip.budgetTransport || 0), budgetActivities: String(trip.budgetActivities || 0),
          budgetOther: String(trip.budgetOther || 0), totalBudget: String(trip.totalBudget || 0),
        });
        break;
      case "carte":
        setMapUrl(trip.googleMyMapsUrl || "");
        break;
      case "apparence":
        setApparenceForm({
          coverImageUrl: trip.coverImageUrl || "", welcomeText: trip.welcomeText || "",
        });
        break;
      case "infos":
        setTravelInfo(trip.travelInfo || {});
        break;
    }
  };

  const openSection = (section: string) => {
    initSection(section);
    setActiveSection(section);
  };

  const sectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/admin/trips/${tripId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips"] });
      toast({ title: "Modifications enregistrées" });
      setActiveSection(null);
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const handleAutoFillInfo = async () => {
    if (!trip?.destination) return;
    setAutoFillLoading(true);
    try {
      const res = await fetch(`/api/admin/trips/${tripId}/auto-fill-info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: trip.destination }), credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Pays non reconnu", description: err.message || "Remplissez les infos manuellement", variant: "destructive" });
        return;
      }
      const updated = await res.json();
      if (updated.travelInfo) {
        setTravelInfo(updated.travelInfo);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/trips"] });
        toast({ title: "Infos pratiques pré-remplies !", description: "Vérifiez et ajustez si nécessaire." });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de remplir automatiquement", variant: "destructive" });
    } finally {
      setAutoFillLoading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const result = await uploadFile(file);
      if (result) {
        setApparenceForm((prev: any) => ({ ...prev, coverImageUrl: result.objectPath }));
        toast({ title: "Photo de couverture ajoutée" });
      }
    } catch {
      toast({ title: "Erreur lors de l'upload", variant: "destructive" });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const updateInfo = (key: string, value: any) => setTravelInfo((prev: any) => ({ ...prev, [key]: value }));

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!trip) return <p className="text-muted-foreground text-center py-8">Voyage introuvable</p>;

  const shareUrl = trip.shareToken ? `${window.location.origin}/share/${trip.shareToken}` : null;
  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast({ title: "Lien copié !" });
    }
  };

  const sendShareEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/admin/trips/${trip.id}/share-email`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: data.message });
    } catch (err: any) {
      toast({ title: err.message || "Erreur", variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  const dayCount = trip.days?.length || 0;
  const checklistCount = trip.checklistItems?.length || 0;
  const totalBudget = (trip.budgetHotel || 0) + (trip.budgetFood || 0) + (trip.budgetTransport || 0) + (trip.budgetActivities || 0) + (trip.budgetOther || 0);
  const finalBudget = totalBudget > 0 ? totalBudget : (trip.totalBudget || 0);
  const emailList = trip.assignedToEmail ? trip.assignedToEmail.split(",").map((e: string) => e.trim()).filter(Boolean) : [];
  const hasTravelInfo = trip.travelInfo && Object.values(trip.travelInfo).some((v: any) => v !== undefined && v !== "" && v !== null);
  const hasApparence = !!(trip.coverImageUrl || trip.welcomeText);

  const sections = [
    { key: "voyage", label: "Le Voyage", icon: Plane, badge: null },
    { key: "participants", label: "Participants & Clients", icon: Users, badge: ((trip.participants?.length || 0) + emailList.length) > 0 ? String((trip.participants?.length || 0) + emailList.length) : null },
    { key: "budget", label: "Budget", icon: Wallet, badge: finalBudget > 0 ? `${trip.currency || "€"}${finalBudget.toLocaleString()}` : null },
    { key: "carte", label: "Carte", icon: MapIcon, badge: trip.googleMyMapsUrl ? "check" : null },
    { key: "apparence", label: "Apparence", icon: Camera, badge: hasApparence ? "check" : null },
    { key: "infos", label: "Infos pratiques", icon: Info, badge: hasTravelInfo ? "check" : null },
    { key: "checklist", label: "Checklist", icon: CheckSquare, badge: checklistCount > 0 ? String(checklistCount) : null },
    { key: "planning", label: "Planning", icon: Calendar, badge: dayCount > 0 ? `${dayCount} jour${dayCount > 1 ? "s" : ""}` : null },
    { key: "documents", label: "Documents", icon: FileText, badge: (trip.documents?.length || 0) > 0 ? String(trip.documents.length) : null },
  ];

  const saveVoyage = () => {
    if (!voyageForm.title.trim()) { toast({ title: "Le titre est requis", variant: "destructive" }); return; }
    sectionMutation.mutate({
      title: voyageForm.title, origin: voyageForm.origin || null, destination: voyageForm.destination || null,
      subtitle: voyageForm.subtitle || null, coverEmoji: voyageForm.coverEmoji || null,
      status: voyageForm.status, departureDate: voyageForm.departureDate || null,
      returnDate: voyageForm.returnDate || null, travelers: Number(voyageForm.travelers),
      currency: voyageForm.currency,
    });
  };

  const saveParticipants = () => {
    sectionMutation.mutate({ participants: participantNames.length > 0 ? participantNames : [], assignedToEmail: clientEmails || null });
  };

  const saveBudget = () => {
    const catSum = Number(budgetForm.budgetHotel) + Number(budgetForm.budgetFood) + Number(budgetForm.budgetTransport) + Number(budgetForm.budgetActivities) + Number(budgetForm.budgetOther);
    sectionMutation.mutate({
      budgetHotel: Number(budgetForm.budgetHotel), budgetFood: Number(budgetForm.budgetFood),
      budgetTransport: Number(budgetForm.budgetTransport), budgetActivities: Number(budgetForm.budgetActivities),
      budgetOther: Number(budgetForm.budgetOther), totalBudget: catSum > 0 ? catSum : Number(budgetForm.totalBudget),
    });
  };

  const saveCarte = () => {
    sectionMutation.mutate({ googleMyMapsUrl: mapUrl || null });
  };

  const saveApparence = () => {
    sectionMutation.mutate({
      coverImageUrl: apparenceForm.coverImageUrl || null,
      welcomeText: apparenceForm.welcomeText || null,
    });
  };

  const saveInfos = () => {
    const hasInfo = Object.values(travelInfo).some((v: any) => v !== undefined && v !== "" && v !== null);
    sectionMutation.mutate({ travelInfo: hasInfo ? travelInfo : null });
  };

  const sectionTitles: Record<string, string> = {
    voyage: "Le Voyage", participants: "Participants & Clients", budget: "Budget",
    carte: "Carte", apparence: "Apparence",
    infos: "Infos pratiques", checklist: "Checklist", planning: "Planning", documents: "Documents",
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "voyage":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Titre du voyage</Label>
                <Input value={voyageForm.title} onChange={e => setVoyageForm((p: any) => ({ ...p, title: e.target.value }))} required data-testid="section-input-title" />
              </div>
              <div>
                <Label>Pays de départ</Label>
                <Input value={voyageForm.origin} onChange={e => setVoyageForm((p: any) => ({ ...p, origin: e.target.value }))} placeholder="Ex: France" data-testid="section-input-origin" />
              </div>
              <div>
                <Label>Destination</Label>
                <Input value={voyageForm.destination} onChange={e => setVoyageForm((p: any) => ({ ...p, destination: e.target.value }))} data-testid="section-input-destination" />
              </div>
              <div>
                <Label>Sous-titre</Label>
                <Input value={voyageForm.subtitle} onChange={e => setVoyageForm((p: any) => ({ ...p, subtitle: e.target.value }))} data-testid="section-input-subtitle" />
              </div>
              <div>
                <Label>Emoji couverture</Label>
                <Input value={voyageForm.coverEmoji} onChange={e => setVoyageForm((p: any) => ({ ...p, coverEmoji: e.target.value }))} data-testid="section-input-emoji" />
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={voyageForm.status} onValueChange={v => setVoyageForm((p: any) => ({ ...p, status: v }))}>
                  <SelectTrigger data-testid="section-select-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="archived">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date de départ</Label>
                <Input type="date" value={voyageForm.departureDate} onChange={e => setVoyageForm((p: any) => ({ ...p, departureDate: e.target.value }))} data-testid="section-input-departure" />
              </div>
              <div>
                <Label>Date de retour</Label>
                <Input type="date" value={voyageForm.returnDate} onChange={e => setVoyageForm((p: any) => ({ ...p, returnDate: e.target.value }))} data-testid="section-input-return" />
              </div>
              <div>
                <Label>Voyageurs</Label>
                <Input type="number" value={voyageForm.travelers} onChange={e => setVoyageForm((p: any) => ({ ...p, travelers: e.target.value }))} data-testid="section-input-travelers" />
              </div>
              <div>
                <Label>Devise</Label>
                <Input value={voyageForm.currency} onChange={e => setVoyageForm((p: any) => ({ ...p, currency: e.target.value }))} data-testid="section-input-currency" />
              </div>
            </div>
            <Button onClick={saveVoyage} disabled={sectionMutation.isPending} className="w-full" data-testid="section-button-save-voyage">
              <Save className="w-4 h-4 mr-1" /> {sectionMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        );
      case "participants":
        return (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Nommez les participants pour le partage de dépenses (Tricount)</p>
            <div className="flex flex-wrap gap-1.5">
              {participantNames.map((name, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1" data-testid={`section-badge-participant-${i}`}>
                  {name}
                  <button type="button" onClick={() => setParticipantNames(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 rounded-full p-0.5" data-testid={`section-remove-participant-${i}`}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {participantNames.length < 10 && (
              <div className="flex items-center gap-2">
                <Input
                  value={newParticipant}
                  onChange={e => setNewParticipant(e.target.value)}
                  placeholder="Nom du participant"
                  onKeyDown={e => { if (e.key === "Enter" && newParticipant.trim()) { e.preventDefault(); setParticipantNames(prev => [...prev, newParticipant.trim()]); setNewParticipant(""); } }}
                  data-testid="section-input-participant"
                />
                <Button type="button" size="icon" variant="secondary" disabled={!newParticipant.trim()} onClick={() => { setParticipantNames(prev => [...prev, newParticipant.trim()]); setNewParticipant(""); }} data-testid="section-button-add-participant">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">{participantNames.length}/10 participants</p>
            <div className="border-t pt-4 mt-2">
              <Label className="flex items-center gap-1.5 mb-2"><Mail className="w-4 h-4" /> Emails des clients</Label>
              <p className="text-xs text-muted-foreground mb-2">Ajoutez les emails des clients qui auront accès au voyage</p>
              <ClientEmailsEditor emails={clientEmails} onChange={setClientEmails} />
            </div>
            <Button onClick={saveParticipants} disabled={sectionMutation.isPending} className="w-full" data-testid="section-button-save-participants">
              <Save className="w-4 h-4 mr-1" /> {sectionMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        );
      case "budget":
        return (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Définissez le budget prévu pour chaque poste de dépense</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1"><Hotel className="w-3.5 h-3.5 text-purple-400" /> Hébergement</Label>
                <Input type="number" value={budgetForm.budgetHotel} onChange={e => setBudgetForm((p: any) => ({ ...p, budgetHotel: e.target.value }))} min="0" data-testid="section-input-budget-hotel" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1"><UtensilsCrossed className="w-3.5 h-3.5 text-orange-400" /> Repas</Label>
                <Input type="number" value={budgetForm.budgetFood} onChange={e => setBudgetForm((p: any) => ({ ...p, budgetFood: e.target.value }))} min="0" data-testid="section-input-budget-food" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1"><Bus className="w-3.5 h-3.5 text-blue-400" /> Transport</Label>
                <Input type="number" value={budgetForm.budgetTransport} onChange={e => setBudgetForm((p: any) => ({ ...p, budgetTransport: e.target.value }))} min="0" data-testid="section-input-budget-transport" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1"><Zap className="w-3.5 h-3.5 text-emerald-400" /> Activités</Label>
                <Input type="number" value={budgetForm.budgetActivities} onChange={e => setBudgetForm((p: any) => ({ ...p, budgetActivities: e.target.value }))} min="0" data-testid="section-input-budget-activities" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5 mb-1"><MoreHorizontal className="w-3.5 h-3.5 text-gray-400" /> Autre</Label>
                <Input type="number" value={budgetForm.budgetOther} onChange={e => setBudgetForm((p: any) => ({ ...p, budgetOther: e.target.value }))} min="0" data-testid="section-input-budget-other" />
              </div>
            </div>
            <div className="pt-3 border-t border-border/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total catégories</span>
              <span className="text-sm font-bold">{trip.currency || "€"}{(Number(budgetForm.budgetHotel || 0) + Number(budgetForm.budgetFood || 0) + Number(budgetForm.budgetTransport || 0) + Number(budgetForm.budgetActivities || 0) + Number(budgetForm.budgetOther || 0)).toLocaleString()}</span>
            </div>
            <Button onClick={saveBudget} disabled={sectionMutation.isPending} className="w-full" data-testid="section-button-save-budget">
              <Save className="w-4 h-4 mr-1" /> {sectionMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        );
      case "carte":
        return (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Collez le lien de partage de votre carte Google My Maps</p>
            <Input value={mapUrl} onChange={e => setMapUrl(e.target.value)} placeholder="https://www.google.com/maps/d/u/0/edit?mid=..." data-testid="section-input-map-url" />
            {mapUrl && (
              <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Carte Google My Maps configurée
              </p>
            )}
            <Button onClick={saveCarte} disabled={sectionMutation.isPending} className="w-full" data-testid="section-button-save-carte">
              <Save className="w-4 h-4 mr-1" /> {sectionMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        );
      case "apparence":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-bold flex items-center gap-2 mb-2">
                <Upload className="w-4 h-4" /> Photo de couverture
              </Label>
              {apparenceForm.coverImageUrl && (
                <div className="relative mb-3">
                  <img src={apparenceForm.coverImageUrl} alt="Couverture" className="w-full h-32 object-cover rounded-md" data-testid="section-cover-preview" />
                  <Button type="button" size="icon" variant="destructive" className="absolute top-2 right-2" onClick={() => setApparenceForm((p: any) => ({ ...p, coverImageUrl: "" }))} data-testid="section-button-remove-cover">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md hover-elevate text-sm text-muted-foreground">
                  {isUploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isUploadingCover ? "Upload en cours..." : "Choisir une photo"}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={isUploadingCover} data-testid="section-input-cover-photo" />
              </label>
            </div>
            <div>
              <Label className="text-sm font-bold flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" /> Texte d'accueil
              </Label>
              <Textarea value={apparenceForm.welcomeText} onChange={e => setApparenceForm((p: any) => ({ ...p, welcomeText: e.target.value }))} placeholder="Bonjour, votre voyage vous attend !" className="resize-none" rows={2} data-testid="section-input-welcome-text" />
            </div>
            <Button onClick={saveApparence} disabled={sectionMutation.isPending} className="w-full" data-testid="section-button-save-apparence">
              <Save className="w-4 h-4 mr-1" /> {sectionMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        );
      case "infos":
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-purple-500/10 p-3">
              <p className="text-xs text-muted-foreground mb-2">
                Destination actuelle : <span className="font-semibold text-foreground">{trip.destination || "Non définie"}</span>
              </p>
              {trip.destination ? (
                <Button
                  onClick={handleAutoFillInfo}
                  disabled={autoFillLoading}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                  data-testid="button-auto-fill-info"
                >
                  {autoFillLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1.5" />}
                  {autoFillLoading ? "Recherche en cours..." : "Remplir automatiquement"}
                </Button>
              ) : (
                <p className="text-xs text-amber-500">Définissez d'abord une destination dans le bloc "Le Voyage"</p>
              )}
            </div>
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-md p-3 border border-border/30">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Urgences
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">N{"\u00b0"} urgences</Label>
                    <Input value={travelInfo.emergencyLocal || ""} onChange={e => updateInfo("emergencyLocal", e.target.value)} placeholder="ex: 191" data-testid="section-input-emergency-local" />
                  </div>
                  <div>
                    <Label className="text-xs">Police</Label>
                    <Input value={travelInfo.emergencyPolice || ""} onChange={e => updateInfo("emergencyPolice", e.target.value)} placeholder="ex: 191" data-testid="section-input-emergency-police" />
                  </div>
                  <div>
                    <Label className="text-xs">Ambulance / SAMU</Label>
                    <Input value={travelInfo.emergencyAmbulance || ""} onChange={e => updateInfo("emergencyAmbulance", e.target.value)} placeholder="ex: 1669" data-testid="section-input-emergency-ambulance" />
                  </div>
                  <div>
                    <Label className="text-xs">Pompiers</Label>
                    <Input value={travelInfo.emergencyFire || ""} onChange={e => updateInfo("emergencyFire", e.target.value)} placeholder="ex: 199" data-testid="section-input-emergency-fire" />
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 rounded-md p-3 border border-border/30">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Ambassade / Consulat
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <Label className="text-xs">Adresse / infos</Label>
                    <Input value={travelInfo.embassy || ""} onChange={e => updateInfo("embassy", e.target.value)} placeholder="Ambassade de France, Bangkok" data-testid="section-input-embassy" />
                  </div>
                  <div>
                    <Label className="text-xs">Téléphone</Label>
                    <Input value={travelInfo.embassyPhone || ""} onChange={e => updateInfo("embassyPhone", e.target.value)} placeholder="+66 2 657 5100" data-testid="section-input-embassy-phone" />
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 rounded-md p-3 border border-border/30">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Fuseau horaire
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Fuseau</Label>
                    <Input value={travelInfo.timezone || ""} onChange={e => updateInfo("timezone", e.target.value)} placeholder="ex: Asia/Bangkok" data-testid="section-input-timezone" />
                  </div>
                  <div>
                    <Label className="text-xs">Décalage</Label>
                    <Input value={travelInfo.timezoneOffset || ""} onChange={e => updateInfo("timezoneOffset", e.target.value)} placeholder="ex: UTC+7" data-testid="section-input-timezone-offset" />
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 rounded-md p-3 border border-border/30">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5" /> Devise & pourboire
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Devise locale</Label>
                    <Input value={travelInfo.localCurrency || ""} onChange={e => updateInfo("localCurrency", e.target.value)} placeholder="ex: Baht" data-testid="section-input-local-currency" />
                  </div>
                  <div>
                    <Label className="text-xs">Symbole</Label>
                    <Input value={travelInfo.localCurrencySymbol || ""} onChange={e => updateInfo("localCurrencySymbol", e.target.value)} data-testid="section-input-local-currency-symbol" />
                  </div>
                  <div>
                    <Label className="text-xs">Taux de change</Label>
                    <Input type="number" step="0.01" value={travelInfo.exchangeRate || ""} onChange={e => updateInfo("exchangeRate", e.target.value ? Number(e.target.value) : undefined)} data-testid="section-input-exchange-rate" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Culture du pourboire</Label>
                    <Textarea value={travelInfo.tippingCulture || ""} onChange={e => updateInfo("tippingCulture", e.target.value)} className="resize-none" rows={2} data-testid="section-input-tipping" />
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 rounded-md p-3 border border-border/30">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Plug className="w-3.5 h-3.5" /> Prises électriques
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Voltage</Label>
                    <Input value={travelInfo.voltage || ""} onChange={e => updateInfo("voltage", e.target.value)} placeholder="ex: 220V / 50Hz" data-testid="section-input-voltage" />
                  </div>
                  <div>
                    <Label className="text-xs">Type de prise</Label>
                    <Input value={travelInfo.plugType || ""} onChange={e => updateInfo("plugType", e.target.value)} data-testid="section-input-plug-type" />
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 rounded-md p-3 border border-border/30">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5" /> SIM & WiFi
                </p>
                <Textarea value={travelInfo.simWifi || ""} onChange={e => updateInfo("simWifi", e.target.value)} className="resize-none" rows={2} data-testid="section-input-sim-wifi" />
              </div>
              <div className="bg-muted/50 rounded-md p-3 border border-border/30">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" /> Notes complémentaires
                </p>
                <Textarea value={travelInfo.customNotes || ""} onChange={e => updateInfo("customNotes", e.target.value)} className="resize-none" rows={3} data-testid="section-input-custom-notes" />
              </div>
            </div>
            <Button onClick={saveInfos} disabled={sectionMutation.isPending} className="w-full" data-testid="section-button-save-infos">
              <Save className="w-4 h-4 mr-1" /> {sectionMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        );
      case "checklist":
        return <ChecklistEditor tripId={tripId} trip={trip} />;
      case "planning":
        return <DayEditor tripId={tripId} trip={trip} />;
      case "documents":
        return (
          <div className="space-y-4">
            <GuideUploader tripId={tripId} currentGuideUrl={trip.guideUrl} />
            <DocumentsEditor tripId={tripId} trip={trip} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {trip.coverEmoji && <span className="text-3xl" data-testid="text-trip-emoji">{trip.coverEmoji}</span>}
            <div>
              <h2 className="text-xl font-display font-bold" data-testid="text-trip-title">{trip.title}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {trip.destination && <span className="text-sm text-muted-foreground" data-testid="text-trip-destination">{trip.origin ? `${trip.origin} → ${trip.destination}` : trip.destination}</span>}
                <Badge variant={trip.status === "active" ? "default" : "secondary"} className="text-[10px]" data-testid="badge-trip-status">
                  {trip.status === "active" ? "Actif" : trip.status === "archived" ? "Archivé" : "Brouillon"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        {shareUrl && (
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs bg-muted px-2 py-1 rounded border border-border/30 flex-1 min-w-0 truncate" data-testid="text-share-url">{shareUrl}</code>
            <Button variant="outline" size="sm" onClick={copyShareLink} data-testid="admin-button-copy-share">
              <Copy className="w-3.5 h-3.5 mr-1" /> Copier
            </Button>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" data-testid="admin-button-open-share">
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
            {emailList.length > 0 && (
              <Button variant="default" size="sm" onClick={sendShareEmail} disabled={sendingEmail} data-testid="admin-button-send-share-email">
                {sendingEmail ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1" />}
                Envoyer par email
              </Button>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground" data-testid="text-trip-summary">
          {dayCount > 0 ? `${dayCount} jour${dayCount > 1 ? "s" : ""}` : "0 jour"}
          {" · "}
          {trip.travelers || 0} voyageur{(trip.travelers || 0) > 1 ? "s" : ""}
          {finalBudget > 0 && <> · Budget {trip.currency || "€"}{finalBudget.toLocaleString()}</>}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {sections.map((section) => (
          <Card
            key={section.key}
            className="relative p-4 cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center gap-2"
            onClick={() => openSection(section.key)}
            data-testid={`card-section-${section.key}`}
          >
            {section.badge && (
              section.badge === "check" ? (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <Check className="w-3 h-3 text-emerald-500" />
                  </div>
                </div>
              ) : (
                <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] px-1.5 py-0" data-testid={`badge-section-${section.key}`}>
                  {section.badge}
                </Badge>
              )
            )}
            <section.icon className="w-7 h-7 text-primary" />
            <span className="text-sm font-medium">{section.label}</span>
          </Card>
        ))}
      </div>

      <Dialog open={!!activeSection} onOpenChange={(open) => { if (!open) setActiveSection(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{activeSection ? sectionTitles[activeSection] : ""}</DialogTitle>
            <DialogDescription className="sr-only">
              {activeSection ? `Modifier la section ${sectionTitles[activeSection]}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            {renderSectionContent()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const ADMIN_DOC_TYPES = [
  { value: "flight", label: "Vol", icon: Plane },
  { value: "hotel", label: "Hébergement", icon: Hotel },
  { value: "transport", label: "Transport", icon: Bus },
  { value: "insurance", label: "Assurance", icon: Shield },
  { value: "identity", label: "Identité", icon: FileText },
  { value: "activity", label: "Activité", icon: Camera },
  { value: "other", label: "Autre", icon: FileText },
] as const;

function DocumentsEditor({ tripId, trip }: { tripId: number, trip: TripWithDetails }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const documents = trip.documents || [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<any>(null);
  const [form, setForm] = useState({ name: "", type: "other", url: "", note: "" });

  const createMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/admin/trips/${tripId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      toast({ title: "Document ajouté" });
      closeDialog();
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/admin/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      toast({ title: "Document modifié" });
      closeDialog();
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/documents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips", tripId] });
      toast({ title: "Document supprimé" });
    },
  });

  function openAdd(type?: string) {
    setEditDoc(null);
    setForm({ name: "", type: type || "other", url: "", note: "" });
    setDialogOpen(true);
  }

  function openEdit(doc: any) {
    setEditDoc(doc);
    setForm({ name: doc.name, type: doc.type, url: doc.url, note: doc.note || "" });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditDoc(null);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.url.trim()) {
      toast({ title: "Nom et URL requis", variant: "destructive" });
      return;
    }
    if (editDoc) {
      updateMut.mutate({ id: editDoc.id, data: form });
    } else {
      createMut.mutate(form);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documents de voyage
          </h3>
          <p className="text-xs text-muted-foreground">
            {documents.length} document{documents.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => openAdd()} data-testid="admin-button-add-document">
          <Plus className="w-4 h-4 mr-1.5" /> Ajouter
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ADMIN_DOC_TYPES.map(t => (
          <Button
            key={t.value}
            variant="outline"
            size="sm"
            onClick={() => openAdd(t.value)}
            className="gap-1.5"
            data-testid={`admin-quickadd-doc-${t.value}`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </Button>
        ))}
      </div>

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc: any) => {
            const TypeIcon = ADMIN_DOC_TYPES.find(t => t.value === doc.type)?.icon || FileText;
            return (
              <div key={doc.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border border-border/50" data-testid={`admin-doc-${doc.id}`}>
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <TypeIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">
                      {ADMIN_DOC_TYPES.find(t => t.value === doc.type)?.label || "Document"}
                    </Badge>
                    {doc.note && <span className="text-[10px] text-muted-foreground truncate">{doc.note}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" data-testid={`admin-open-doc-${doc.id}`}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(doc)} data-testid={`admin-edit-doc-${doc.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMut.mutate(doc.id)}
                    disabled={deleteMut.isPending}
                    data-testid={`admin-delete-doc-${doc.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDoc ? "Modifier le document" : "Ajouter un document"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Billet d'avion Paris-Bangkok"
                data-testid="admin-input-doc-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger data-testid="admin-select-doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_DOC_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>URL du document</Label>
              <Input
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
                data-testid="admin-input-doc-url"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optionnelle)</Label>
              <Input
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Ex: Vol aller retour, 2 personnes"
                data-testid="admin-input-doc-note"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog} data-testid="admin-button-doc-cancel">Annuler</Button>
              <Button
                onClick={handleSubmit}
                disabled={createMut.isPending || updateMut.isPending}
                data-testid="admin-button-doc-save"
              >
                {editDoc ? "Modifier" : "Ajouter"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AILoadingState({ onCancel }: { onCancel: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const messages = [
    "Analyse de votre description...",
    "Recherche des meilleures activités...",
    "Planification de l'itinéraire...",
    "Calcul des budgets...",
    "Rédaction des conseils pratiques...",
    "Finalisation du voyage...",
  ];
  const msgIndex = Math.min(Math.floor(elapsed / 15), messages.length - 1);

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
          <Wand2 className="w-7 h-7 text-violet-400 animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" />
      </div>
      <div className="text-center">
        <p className="font-bold font-display text-sm" data-testid="text-ai-loading">{messages[msgIndex]}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {elapsed < 60
            ? `${elapsed}s — La génération peut prendre 1 à 2 minutes`
            : `${Math.floor(elapsed / 60)}min ${elapsed % 60}s — Encore un peu de patience...`}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs text-muted-foreground">
        Annuler
      </Button>
    </div>
  );
}

function AIGenerateDialog({ onCreated }: { onCreated: () => void }) {
  const [description, setDescription] = useState("");
  const [generatedTrip, setGeneratedTrip] = useState<any>(null);
  const [step, setStep] = useState<"input" | "loading" | "preview" | "creating" | "error">("input");
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generate = async () => {
    if (!description.trim()) return;
    setStep("loading");
    setErrorMsg("");
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 300000);
    try {
      const res = await fetch("/api/admin/generate-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erreur de génération" }));
        throw new Error(err.message || "Erreur de génération");
      }
      const data = await res.json();
      setGeneratedTrip(data);
      setStep("preview");
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        setErrorMsg("La génération a pris trop de temps (plus de 5 minutes). Réessayez.");
      } else {
        setErrorMsg(err.message || "Erreur inconnue");
      }
      setStep("error");
    }
  };

  const createTrip = async () => {
    if (!generatedTrip) return;
    setStep("creating");
    try {
      const res = await fetch("/api/admin/create-from-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripData: generatedTrip }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors de la création");
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/trips"] });
      toast({ title: "Voyage créé avec succès !" });
      onCreated();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la création");
      setStep("error");
    }
  };

  const reset = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setDescription("");
    setGeneratedTrip(null);
    setStep("input");
    setErrorMsg("");
  };

  if (step === "input") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display" data-testid="text-ai-title">Générer avec l'IA</h2>
            <p className="text-xs text-muted-foreground">Décrivez votre voyage de rêve et l'IA créera tout l'itinéraire</p>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Décrivez le voyage</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Un voyage de 7 jours au Japon en avril pour voir les cerisiers en fleur. Budget moyen, on adore la street food et les temples. On veut aussi visiter Kyoto et Tokyo. 2 voyageurs."
            className="min-h-[140px] mt-2 text-sm"
            data-testid="ai-input-description"
          />
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Plus votre description est détaillée, meilleur sera le résultat (destination, durée, budget, centres d'intérêt, nombre de voyageurs...)
          </p>
        </div>

        <Button
          onClick={generate}
          disabled={!description.trim()}
          className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white border-0"
          data-testid="ai-button-generate"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Générer l'itinéraire
        </Button>
      </div>
    );
  }

  if (step === "loading") {
    return <AILoadingState onCancel={reset} />;
  }

  if (step === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>
        <div className="text-center">
          <p className="font-bold text-sm">Erreur de génération</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">{errorMsg}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset} data-testid="ai-button-retry">
            Recommencer
          </Button>
          <Button size="sm" onClick={generate} data-testid="ai-button-retry-same">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (step === "creating") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="font-bold font-display text-sm">Création du voyage en cours...</p>
      </div>
    );
  }

  if (step === "preview" && generatedTrip) {
    const totalActivities = generatedTrip.days?.reduce((sum: number, d: any) => sum + (d.activities?.length || 0), 0) || 0;
    const totalTips = generatedTrip.days?.reduce((sum: number, d: any) => sum + (d.tips?.length || 0), 0) || 0;
    const cities = Array.from(new Set(generatedTrip.days?.map((d: any) => d.city) || [])) as string[];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{generatedTrip.coverEmoji}</span>
            <div>
              <h2 className="text-lg font-bold font-display" data-testid="text-ai-preview-title">{generatedTrip.title}</h2>
              <p className="text-xs text-muted-foreground">{generatedTrip.subtitle}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            Généré par IA
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold font-display">{generatedTrip.days?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Jours</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold font-display">{totalActivities}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Activités</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold font-display">{generatedTrip.totalBudget}{generatedTrip.currency}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget/pers</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold font-display">{generatedTrip.checklist?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Checklist</p>
          </Card>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {cities.map((city: string) => (
            <Badge key={city} variant="outline" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {city}
            </Badge>
          ))}
        </div>

        <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
          {generatedTrip.days?.map((day: any) => (
            <Card key={day.dayNumber} className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: day.color }}>
                  {day.dayNumber}
                </div>
                <span className="text-sm font-bold">{day.city}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{day.dateLabel}</span>
              </div>
              <div className="space-y-1">
                {day.activities?.map((act: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-10 shrink-0">{act.time}</span>
                    <span className="flex-1 truncate">{act.title}</span>
                    {act.isPersonal && (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 no-default-active-elevate">perso</Badge>
                    )}
                    {act.cost > 0 && (
                      <span className="text-muted-foreground shrink-0">{act.cost}{generatedTrip.currency}</span>
                    )}
                  </div>
                ))}
              </div>
              {day.tips?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/30">
                  {day.tips.map((tip: string, i: number) => (
                    <p key={i} className="text-[10px] text-emerald-500 flex items-start gap-1">
                      <Lightbulb className="w-3 h-3 shrink-0 mt-0.5" />
                      {tip}
                    </p>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t border-border/30">
          <Button variant="outline" onClick={reset} className="flex-1" data-testid="ai-button-discard">
            <X className="w-4 h-4 mr-1" />
            Recommencer
          </Button>
          <Button onClick={createTrip} className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white border-0" data-testid="ai-button-create">
            <Check className="w-4 h-4 mr-1" />
            Créer ce voyage
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

type AdminUser = User & { currentTripsCount: number };

function AdminManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [formEmail, setFormEmail] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formMaxTrips, setFormMaxTrips] = useState("1");
  const [formNotes, setFormNotes] = useState("");
  const [formHasAiAccess, setFormHasAiAccess] = useState(false);

  const { data: admins, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/super-admin/admins"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/admins", { credentials: "include" });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
  });

  const createAdmin = useMutation({
    mutationFn: async (data: { email: string; displayName: string; maxTrips: number; notes: string }) => {
      const res = await fetch("/api/super-admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erreur");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/admins"] });
      setShowAddDialog(false);
      resetForm();
      toast({ title: "Admin créé" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const updateAdmin = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/super-admin/admins/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erreur");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/admins"] });
      setEditingAdmin(null);
      toast({ title: "Admin mis à jour" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const deleteAdmin = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/super-admin/admins/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erreur");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/admins"] });
      toast({ title: "Admin supprimé" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const regenerateToken = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/super-admin/admins/${id}/regenerate-token`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erreur");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/admins"] });
      toast({ title: "Token régénéré" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/super-admin/admins/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/admins"] });
    },
  });

  function resetForm() {
    setFormEmail("");
    setFormDisplayName("");
    setFormMaxTrips("1");
    setFormNotes("");
    setFormHasAiAccess(false);
  }

  function openEditDialog(admin: AdminUser) {
    setEditingAdmin(admin);
    setFormEmail(admin.email || "");
    setFormDisplayName(admin.displayName || "");
    setFormMaxTrips(String(admin.maxTrips ?? 1));
    setFormNotes(admin.notes || "");
    setFormHasAiAccess(!!(admin as any).hasAiAccess);
  }

  function copyTokenLink(admin: AdminUser) {
    if (!admin.accessToken) return;
    const link = `${window.location.origin}/auth/token/${admin.accessToken}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({ title: "Lien copié" });
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const superAdmins = (admins || []).filter(a => a.role === "super_admin");
  const regularAdmins = (admins || []).filter(a => a.role === "admin");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-display font-bold" data-testid="text-admin-management-title">Gestion des administrateurs</h2>
          <p className="text-sm text-muted-foreground">{regularAdmins.length} admin{regularAdmins.length > 1 ? "s" : ""} invité{regularAdmins.length > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => { resetForm(); setShowAddDialog(true); }} data-testid="button-add-admin">
          <UserPlus className="w-4 h-4 mr-1" /> Inviter un admin
        </Button>
      </div>

      {superAdmins.map(admin => (
        <Card key={admin.id} className="p-4" data-testid={`card-admin-${admin.id}`}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm" data-testid={`text-admin-name-${admin.id}`}>{admin.displayName || admin.firstName || "Super Admin"}</p>
                <Badge variant="default" className="text-[10px] bg-amber-500/20 text-amber-500 border-amber-500/30">Super Admin</Badge>
              </div>
              <p className="text-xs text-muted-foreground" data-testid={`text-admin-email-${admin.id}`}>{admin.email}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium" data-testid={`text-admin-trips-${admin.id}`}>{admin.currentTripsCount} voyage{admin.currentTripsCount !== 1 ? "s" : ""}</p>
              <p className="text-[10px] text-muted-foreground">Illimité</p>
            </div>
          </div>
        </Card>
      ))}

      {regularAdmins.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Aucun administrateur invité</p>
          <p className="text-xs text-muted-foreground mt-1">Invitez des admins pour qu'ils puissent créer et gérer leurs propres voyages</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {regularAdmins.map(admin => (
            <Card key={admin.id} className="p-4" data-testid={`card-admin-${admin.id}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${admin.isActive ? "bg-primary/15" : "bg-muted"}`}>
                  <Users className={`w-5 h-5 ${admin.isActive ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-medium text-sm ${!admin.isActive ? "text-muted-foreground line-through" : ""}`} data-testid={`text-admin-name-${admin.id}`}>
                      {admin.displayName || admin.email}
                    </p>
                    {!admin.isActive && <Badge variant="secondary" className="text-[10px]">Désactivé</Badge>}
                    {(admin as any).hasAiAccess && <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400">IA</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground" data-testid={`text-admin-email-${admin.id}`}>{admin.email}</p>
                  {admin.notes && <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-xs">{admin.notes}</p>}
                </div>
                <div className="text-right mr-2">
                  <p className="text-sm font-medium" data-testid={`text-admin-trips-${admin.id}`}>
                    {admin.currentTripsCount}/{admin.maxTrips === -1 ? "∞" : admin.maxTrips}
                  </p>
                  <p className="text-[10px] text-muted-foreground">voyage{(admin.maxTrips ?? 1) > 1 ? "s" : ""}</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {admin.accessToken && (
                    <Button size="icon" variant="ghost" onClick={() => copyTokenLink(admin)} title="Copier le lien d'accès" data-testid={`button-copy-token-${admin.id}`}>
                      <Link className="w-4 h-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => openEditDialog(admin)} title="Modifier" data-testid={`button-edit-admin-${admin.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => toggleActive.mutate({ id: admin.id, isActive: !admin.isActive })}
                    title={admin.isActive ? "Désactiver" : "Activer"}
                    data-testid={`button-toggle-admin-${admin.id}`}
                  >
                    {admin.isActive ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { if (confirm(`Supprimer ${admin.displayName || admin.email} ?${admin.currentTripsCount > 0 ? ` Ses ${admin.currentTripsCount} voyage(s) seront transférés à votre compte.` : ""}`)) deleteAdmin.mutate(admin.id); }}
                    title="Supprimer"
                    data-testid={`button-delete-admin-${admin.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter un administrateur</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createAdmin.mutate({ email: formEmail, displayName: formDisplayName, maxTrips: Number(formMaxTrips), notes: formNotes }); }} className="space-y-4">
            <div>
              <Label>Email *</Label>
              <Input value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="admin@example.com" type="email" required data-testid="input-admin-email" />
            </div>
            <div>
              <Label>Nom d'affichage</Label>
              <Input value={formDisplayName} onChange={e => setFormDisplayName(e.target.value)} placeholder="Jean Dupont" data-testid="input-admin-display-name" />
            </div>
            <div>
              <Label>Quota de voyages</Label>
              <Input value={formMaxTrips} onChange={e => setFormMaxTrips(e.target.value)} type="number" min="1" max="100" data-testid="input-admin-max-trips" />
              <p className="text-[10px] text-muted-foreground mt-1">Nombre maximum de voyages que cet admin peut créer</p>
            </div>
            <div>
              <Label>Notes (optionnel)</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Notes internes..." className="resize-none" data-testid="input-admin-notes" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Annuler</Button>
              <Button type="submit" disabled={createAdmin.isPending} data-testid="button-submit-add-admin">
                {createAdmin.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserPlus className="w-4 h-4 mr-1" />}
                Créer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingAdmin} onOpenChange={(open) => { if (!open) setEditingAdmin(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier {editingAdmin?.displayName || editingAdmin?.email}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (editingAdmin) updateAdmin.mutate({ id: editingAdmin.id, data: { email: formEmail, displayName: formDisplayName, maxTrips: Number(formMaxTrips), notes: formNotes, hasAiAccess: formHasAiAccess } }); }} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="admin@example.com" type="email" data-testid="input-edit-admin-email" />
            </div>
            <div>
              <Label>Nom d'affichage</Label>
              <Input value={formDisplayName} onChange={e => setFormDisplayName(e.target.value)} placeholder="Jean Dupont" data-testid="input-edit-admin-display-name" />
            </div>
            <div>
              <Label>Quota de voyages</Label>
              <Input value={formMaxTrips} onChange={e => setFormMaxTrips(e.target.value)} type="number" min="1" max="100" data-testid="input-edit-admin-max-trips" />
              <p className="text-[10px] text-muted-foreground mt-1">Actuellement : {editingAdmin?.currentTripsCount} voyage(s) créé(s)</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Accès IA</Label>
                <p className="text-[10px] text-muted-foreground">Permet la génération de voyages par IA</p>
              </div>
              <Switch checked={formHasAiAccess} onCheckedChange={setFormHasAiAccess} data-testid="switch-edit-admin-ai-access" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Notes internes..." className="resize-none" data-testid="input-edit-admin-notes" />
            </div>
            <div className="border-t border-border/30 pt-4">
              <Label className="text-xs text-muted-foreground">Lien d'accès</Label>
              <div className="flex gap-2 mt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => { if (editingAdmin) copyTokenLink(editingAdmin); }} data-testid="button-copy-edit-token">
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copier le lien
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { if (editingAdmin && confirm("Régénérer le token ? L'ancien lien ne fonctionnera plus.")) regenerateToken.mutate(editingAdmin.id); }} data-testid="button-regenerate-token">
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Régénérer
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingAdmin(null)}>Annuler</Button>
              <Button type="submit" disabled={updateAdmin.isPending} data-testid="button-submit-edit-admin">
                {updateAdmin.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminPage() {
  const { data: trips, isLoading, error } = useAdminTrips();
  const { isSuperAdmin, user: authUser } = useAuth();
  const [selectedTrip, setSelectedTrip] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [newTripTitle, setNewTripTitle] = useState("");
  const [newTripOrigin, setNewTripOrigin] = useState("");
  const [newTripDestination, setNewTripDestination] = useState("");
  const [activeTab, setActiveTab] = useState<"trips" | "admins">("trips");
  const [expandedAdmin, setExpandedAdmin] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: adminsList } = useQuery<AdminUser[]>({
    queryKey: ["/api/super-admin/admins"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/admins", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!isSuperAdmin,
  });

  const deleteTrip = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/trips/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips"] });
      setSelectedTrip(null);
    },
  });

  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [, navigate] = useLocation();

  const createTrip = useMutation({
    mutationFn: async (data: { title: string; origin?: string | null; destination?: string | null }) => {
      const res = await fetch("/api/admin/trips", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), credentials: "include",
      });
      if (res.status === 403) {
        const body = await res.json();
        if (body.upgradeUrl) {
          setUpgradeMessage(body.message);
          setShowUpgradeDialog(true);
          setShowCreateDialog(false);
          throw new Error("__quota__");
        }
        throw new Error(body.message || "Accès refusé");
      }
      if (!res.ok) throw new Error("Erreur lors de la création");
      return res.json();
    },
    onSuccess: (newTrip: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Voyage créé !" });
      setShowCreateDialog(false);
      setNewTripTitle("");
      setNewTripOrigin("");
      setNewTripDestination("");
      setSelectedTrip(newTrip.id);
    },
    onError: (e) => {
      if (e.message === "__quota__") return;
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (trips && trips.length > 0 && selectedTrip === null && !aiMode) {
      if (isSuperAdmin && adminsList && adminsList.length > 0) {
        const superAdmin = adminsList.find(a => a.role === "super_admin");
        if (superAdmin) {
          const superAdminTrips = trips.filter(t => t.userId === superAdmin.id);
          if (superAdminTrips.length > 0) {
            setExpandedAdmin(superAdmin.id);
            setSelectedTrip(superAdminTrips[0].id);
            return;
          }
        }
        const firstAdminWithTrips = adminsList.find(a => trips.some(t => t.userId === a.id));
        if (firstAdminWithTrips) {
          setExpandedAdmin(firstAdminWithTrips.id);
          setSelectedTrip(trips.find(t => t.userId === firstAdminWithTrips.id)!.id);
          return;
        }
      }
      setSelectedTrip(trips[0].id);
    }
  }, [trips, selectedTrip, aiMode, isSuperAdmin, adminsList]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      toast({ title: "Paiement réussi !", description: "Votre plan a été mis à jour." });
      window.history.replaceState({}, "", window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  }, []);

  const userPlan = (authUser as any)?.plan || "free";
  const planLimits = (authUser as any)?.planLimits;
  const activeTripsCount = (authUser as any)?.activeTripsCount ?? 0;
  const maxTrips = planLimits?.maxTrips ?? 1;
  const quotaReached = !isSuperAdmin && maxTrips !== -1 && activeTripsCount >= maxTrips;

  if (error?.message === "Accès refusé") {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-display">Accès réservé</h2>
          <p className="text-muted-foreground text-center max-w-md text-sm">Cette page est réservée aux administrateurs. Si vous pensez que c'est une erreur, contactez l'équipe Voyageo.</p>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold" data-testid="text-admin-title">Administration</h1>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin ? "Gérez les voyages, les admins et leur quota" : "Gérez vos voyages et assignez-les à vos clients"}
            </p>
          </div>
          {activeTab === "trips" && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => { setAiMode(true); setSelectedTrip(null); }} className="bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 border-violet-500/30 hover:border-violet-500/50" disabled={!!quotaReached} data-testid="admin-button-ai-generate">
                <Wand2 className="w-4 h-4 mr-1 text-violet-400" /> Générer avec l'IA
              </Button>
              <Button onClick={() => { setShowCreateDialog(true); setAiMode(false); }} disabled={!!quotaReached} data-testid="admin-button-create-trip">
                <Plus className="w-4 h-4 mr-1" /> Nouveau voyage
              </Button>
            </div>
          )}
        </div>

        {!isSuperAdmin && planLimits && (
          <div className="mb-4" data-testid="plan-banner">
            {(authUser as any)?.planStatus === "past_due" && (
              <div className="mb-3 p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-center gap-2 text-sm" data-testid="text-payment-failed">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-destructive">Paiement en échec — Mettez à jour votre moyen de paiement</span>
                <Button size="sm" variant="destructive" className="ml-auto" onClick={async () => {
                  const res = await fetch("/api/stripe/portal", { method: "POST", credentials: "include" });
                  if (res.ok) { const { url } = await res.json(); window.location.href = url; }
                }} data-testid="button-fix-payment">
                  Mettre à jour
                </Button>
              </div>
            )}
            <div className="p-4 bg-card border border-border/50 rounded-md">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={`text-xs ${
                  userPlan === "free" ? "bg-muted text-muted-foreground" :
                  userPlan === "solo" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" :
                  userPlan === "pro" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30" :
                  "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                }`} data-testid="badge-plan-name">
                  Plan {planLimits.name}
                </Badge>
                <span className="text-sm text-muted-foreground" data-testid="text-quota-count">
                  {maxTrips === -1 ? `${activeTripsCount} voyages actifs` : `${activeTripsCount}/${maxTrips} voyages`}
                </span>
                {userPlan !== "free" && (authUser as any)?.planInterval && (
                  <span className="text-xs text-muted-foreground" data-testid="text-plan-interval">
                    ({(authUser as any)?.planInterval === "year" ? "annuel" : "mensuel"})
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  {userPlan === "free" ? (
                    <Button size="sm" variant="default" onClick={() => navigate("/pricing")} data-testid="button-upgrade">
                      <Sparkles className="w-3.5 h-3.5 mr-1" /> Upgrader
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => navigate("/pricing")} data-testid="button-change-plan">
                        <Sparkles className="w-3.5 h-3.5 mr-1" /> Changer de plan
                      </Button>
                      <Button size="sm" variant="outline" onClick={async () => {
                        const res = await fetch("/api/stripe/portal", { method: "POST", credentials: "include" });
                        if (res.ok) { const { url } = await res.json(); window.location.href = url; }
                      }} data-testid="button-manage-subscription">
                        <CreditCard className="w-3.5 h-3.5 mr-1" /> Facturation
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {maxTrips !== -1 && (
                <Progress value={Math.min((activeTripsCount / maxTrips) * 100, 100)} className="mt-2 h-1.5" data-testid="progress-quota" />
              )}
              {userPlan !== "free" && (
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  {planLimits.hasAI && (
                    <span className="flex items-center gap-1"><Wand2 className="w-3 h-3" /> IA incluse</span>
                  )}
                  {planLimits.maxAdmins !== 1 && (
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {planLimits.maxAdmins === -1 ? "Admins illimités" : `${planLimits.maxAdmins} admins`}</span>
                  )}
                  {(authUser as any)?.planExpiresAt && (
                    <span data-testid="text-plan-renewal">Renouvellement : {new Date((authUser as any).planExpiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {isSuperAdmin && (
          <div className="flex gap-1 mb-6 border-b border-border/50">
            <button
              onClick={() => setActiveTab("trips")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "trips" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              data-testid="tab-trips"
            >
              Voyages
            </button>
            <button
              onClick={() => setActiveTab("admins")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "admins" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              data-testid="tab-admins"
            >
              <Users className="w-4 h-4 inline mr-1" />
              Administrateurs
            </button>
          </div>
        )}

        {activeTab === "admins" && isSuperAdmin ? (
          <AdminManagement />
        ) : aiMode ? (
        <div className="bg-card rounded-md border border-violet-500/20 p-5">
          <AIGenerateDialog onCreated={() => { setAiMode(false); }} />
        </div>
        ) : (!trips || trips.length === 0) ? (
        <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-8 text-center space-y-4" data-testid="welcome-banner">
          <div className="text-4xl">🌴</div>
          <h2 className="text-2xl font-display font-bold">Bienvenue sur Voyageo !</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Créez votre premier voyage et envoyez-le à votre client.
            {userPlan === "free" && " Votre plan gratuit inclut 1 voyage actif."}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button onClick={() => { setShowCreateDialog(true); setAiMode(false); }} data-testid="welcome-button-create">
              <Plus className="w-4 h-4 mr-1" /> Créer mon premier voyage
            </Button>
            {userPlan === "free" && (
              <Button variant="outline" onClick={() => navigate("/pricing")} data-testid="welcome-button-pricing">
                Voir les plans
              </Button>
            )}
          </div>
        </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Voyages ({trips?.length || 0})</h2>
            {isSuperAdmin && adminsList ? (() => {
              const tripsByAdmin = new Map<string, Trip[]>();
              trips?.forEach(trip => {
                const uid = trip.userId || "__unknown__";
                if (!tripsByAdmin.has(uid)) tripsByAdmin.set(uid, []);
                tripsByAdmin.get(uid)!.push(trip);
              });
              const adminsWithTrips = adminsList
                .map(admin => ({
                  ...admin,
                  trips: tripsByAdmin.get(admin.id) || [],
                }))
                .filter(a => a.trips.length > 0 || a.role === "super_admin")
                .sort((a, b) => {
                  if (a.role === "super_admin") return -1;
                  if (b.role === "super_admin") return 1;
                  return b.trips.length - a.trips.length;
                });
              return adminsWithTrips.map(admin => (
                <div key={admin.id} className="space-y-1" data-testid={`admin-group-${admin.id}`}>
                  <div
                    onClick={() => setExpandedAdmin(expandedAdmin === admin.id ? null : admin.id)}
                    className={`p-3 rounded-md border cursor-pointer transition-colors flex items-center gap-2 ${expandedAdmin === admin.id ? "border-primary/50 bg-primary/5" : "border-border/50 hover:bg-muted/30"}`}
                    data-testid={`admin-group-header-${admin.id}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${admin.role === "super_admin" ? "bg-amber-500/15" : "bg-primary/15"}`}>
                      {admin.role === "super_admin" ? <Crown className="w-3.5 h-3.5 text-amber-500" /> : <Users className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{admin.displayName || admin.email}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{admin.trips.length} voyage{admin.trips.length > 1 ? "s" : ""}</Badge>
                    {expandedAdmin === admin.id ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>
                  {expandedAdmin === admin.id && admin.trips.map(trip => (
                    <div
                      key={trip.id}
                      onClick={() => { setSelectedTrip(trip.id); setAiMode(false); }}
                      className={`p-3 rounded-md border cursor-pointer transition-colors ml-4 ${selectedTrip === trip.id ? "border-primary bg-primary/5" : "border-border/50 hover:bg-muted/30"}`}
                      data-testid={`admin-trip-item-${trip.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{trip.coverEmoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{trip.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{trip.origin && trip.destination ? `${trip.origin} → ${trip.destination}` : trip.origin || trip.destination || "—"}</p>
                        </div>
                        <Badge variant={trip.status === "active" ? "default" : "secondary"} className="text-[10px]">
                          {trip.status === "active" ? "Actif" : trip.status === "archived" ? "Archivé" : "Brouillon"}
                        </Badge>
                      </div>
                      {trip.assignedToEmail && (
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">
                          Client{trip.assignedToEmail.includes(",") ? "s" : ""} : {trip.assignedToEmail}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ));
            })() : trips?.map((trip) => (
              <div
                key={trip.id}
                onClick={() => { setSelectedTrip(trip.id); setAiMode(false); }}
                className={`p-3 rounded-md border cursor-pointer transition-colors ${selectedTrip === trip.id ? "border-primary bg-primary/5" : "border-border/50 hover:bg-muted/30"}`}
                data-testid={`admin-trip-item-${trip.id}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{trip.coverEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{trip.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{trip.origin && trip.destination ? `${trip.origin} → ${trip.destination}` : trip.origin || trip.destination || "—"}</p>
                  </div>
                  <Badge variant={trip.status === "active" ? "default" : "secondary"} className="text-[10px]">
                    {trip.status === "active" ? "Actif" : trip.status === "archived" ? "Archivé" : "Brouillon"}
                  </Badge>
                </div>
                {trip.assignedToEmail && (
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">
                    Client{trip.assignedToEmail.includes(",") ? "s" : ""} : {trip.assignedToEmail}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {aiMode ? (
              <div className="bg-card rounded-md border border-violet-500/20 p-5">
                <AIGenerateDialog onCreated={() => { setAiMode(false); }} />
              </div>
            ) : selectedTrip ? (
              <div className="bg-card rounded-md border border-border/50 p-5">
                <TripEditor tripId={selectedTrip} />
                <div className="mt-6 pt-4 border-t border-border/30">
                  <Button variant="destructive" size="sm" onClick={() => { if (confirm("Supprimer ce voyage ?")) deleteTrip.mutate(selectedTrip); }} data-testid="admin-button-delete-trip">
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Supprimer le voyage
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                Sélectionnez un voyage ou créez-en un nouveau
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Créer un nouveau voyage</DialogTitle>
            <DialogDescription>Renseignez le nom et les détails de base du voyage</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!newTripTitle.trim()) return;
            createTrip.mutate({
              title: newTripTitle.trim(),
              origin: newTripOrigin.trim() || null,
              destination: newTripDestination.trim() || null,
            });
          }} className="space-y-4">
            <div>
              <Label>Nom du voyage</Label>
              <Input value={newTripTitle} onChange={e => setNewTripTitle(e.target.value)} placeholder="Ex: Aventure Brésilienne" required data-testid="create-input-title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pays de départ</Label>
                <Input value={newTripOrigin} onChange={e => setNewTripOrigin(e.target.value)} placeholder="Ex: France" data-testid="create-input-origin" />
              </div>
              <div>
                <Label>Destination</Label>
                <Input value={newTripDestination} onChange={e => setNewTripDestination(e.target.value)} placeholder="Ex: Brésil" data-testid="create-input-destination" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Ces champs sont optionnels et modifiables ensuite</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowCreateDialog(false)} data-testid="create-button-cancel">Annuler</Button>
              <Button type="submit" disabled={createTrip.isPending || !newTripTitle.trim()} data-testid="create-button-submit">
                {createTrip.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Créer le voyage
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Quota atteint</DialogTitle>
            <DialogDescription>{upgradeMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)} data-testid="upgrade-button-archive">
              Archiver des voyages
            </Button>
            <Button onClick={() => navigate("/pricing")} data-testid="upgrade-button-plans">
              <Sparkles className="w-4 h-4 mr-1" /> Voir les plans
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
