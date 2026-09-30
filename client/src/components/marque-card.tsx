// « Ma marque » : identité du travel planner reprise sur le carnet PDF et la page voyageur.
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Palette, Loader2, Upload, X, Mail, Phone, Globe } from "lucide-react";

type Marque = { nomAgence: string; logo: string; couleur: string; email: string; telephone: string; siteWeb: string; whatsapp: string; signature: string };
const VIDE: Marque = { nomAgence: "", logo: "", couleur: "#e11d48", email: "", telephone: "", siteWeb: "", whatsapp: "", signature: "" };

/** Redimensionne l'image choisie (400 px de large max) et renvoie une data URL légère. */
async function logoEnDataUrl(fichier: File): Promise<string> {
  const url = URL.createObjectURL(fichier);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    const echelle = Math.min(1, 400 / img.width, 200 / img.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * echelle));
    canvas.height = Math.max(1, Math.round(img.height * echelle));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = canvas.toDataURL("image/png");
    return png.length <= 280_000 ? png : canvas.toDataURL("image/webp", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function MarqueCard({ planAgence }: { planAgence: boolean }) {
  const { toast } = useToast();
  const fichierRef = useRef<HTMLInputElement>(null);
  const [m, setM] = useState<Marque>(VIDE);

  const { data, isLoading } = useQuery<{ marque: Partial<Marque> }>({
    queryKey: ["/api/account/branding"],
    queryFn: async () => {
      const r = await fetch("/api/account/branding", { credentials: "include" });
      if (!r.ok) throw new Error("Chargement impossible");
      return r.json();
    },
  });
  useEffect(() => { if (data?.marque) setM({ ...VIDE, ...data.marque, couleur: data.marque.couleur || VIDE.couleur }); }, [data]);

  const enregistrer = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/account/branding", { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(m) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.message || "Enregistrement impossible");
      return j;
    },
    onSuccess: (j) => {
      queryClient.setQueryData(["/api/account/branding"], j);
      toast({ title: "Marque enregistrée", description: "Elle apparaît sur vos carnets PDF et vos pages voyageurs." });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const champ = (k: keyof Marque) => ({ value: m[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setM({ ...m, [k]: e.target.value }) });

  const choisirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)) return toast({ title: "Format accepté : PNG, JPEG, WebP ou SVG", variant: "destructive" });
    try {
      setM({ ...m, logo: await logoEnDataUrl(f) });
    } catch {
      toast({ title: "Image illisible", variant: "destructive" });
    }
  };

  const couleur = /^#[0-9a-f]{6}$/i.test(m.couleur) ? m.couleur : VIDE.couleur;

  return (
    <Card className="p-6 space-y-5" data-testid="card-marque">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Palette className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-lg">Ma marque</h2>
          <p className="text-sm text-muted-foreground">Vos voyageurs voient votre nom, votre logo et vos coordonnées sur leur carnet PDF et leur page de voyage.</p>
        </div>
      </div>

      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : (
        <>
          {/* Aperçu */}
          <div className="rounded-xl border overflow-hidden" data-testid="apercu-marque">
            <div className="h-1.5" style={{ background: couleur }} />
            <div className="flex items-center gap-3 p-3 bg-white text-neutral-900">
              {m.logo ? <img src={m.logo} alt="" className="h-10 max-w-[140px] object-contain" /> : <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: couleur }}>{(m.nomAgence || "?").slice(0, 1).toUpperCase()}</div>}
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{m.nomAgence || "Nom de votre agence"}</p>
                <p className="text-xs text-neutral-500 truncate">{[m.email, m.telephone, m.siteWeb.replace(/^https?:\/\//, "").replace(/\/$/, "")].filter(Boolean).join(" · ") || "Vos coordonnées"}</p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nom de l'agence ou de la marque</Label>
              <Input placeholder="Ex. Évasions sur mesure" maxLength={80} {...champ("nomAgence")} data-testid="input-marque-nom" />
            </div>
            <div className="space-y-1.5">
              <Label>Logo</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fichierRef.current?.click()}><Upload className="w-4 h-4 mr-1" /> Choisir</Button>
                {m.logo && <Button type="button" variant="ghost" size="sm" onClick={() => setM({ ...m, logo: "" })}><X className="w-4 h-4 mr-1" /> Retirer</Button>}
                <input ref={fichierRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={choisirLogo} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Couleur principale</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={couleur} onChange={(e) => setM({ ...m, couleur: e.target.value })} className="h-9 w-12 rounded border bg-transparent cursor-pointer" aria-label="Couleur" />
                <Input value={m.couleur} onChange={(e) => setM({ ...m, couleur: e.target.value })} maxLength={7} className="font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email de contact</Label>
              <Input type="email" placeholder="contact@agence.fr" {...champ("email")} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Téléphone</Label>
              <Input placeholder="+33 6 12 34 56 78" {...champ("telephone")} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Site internet</Label>
              <Input placeholder="agence.fr" {...champ("siteWeb")} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp (numéro international)</Label>
              <Input placeholder="+33612345678" {...champ("whatsapp")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Signature du carnet</Label>
              <Input placeholder="Ex. Votre voyage, pensé pour vous. Joignable 7 j/7 pendant votre séjour." maxLength={200} {...champ("signature")} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {planAgence
              ? "Plan Agence : marque blanche, aucune mention de Voyageo sur vos carnets."
              : "Une petite mention « Réalisé avec Voyageo » reste en bas du carnet. Le plan Agence la retire (marque blanche)."}
          </p>

          <Button onClick={() => enregistrer.mutate()} disabled={enregistrer.isPending} data-testid="button-marque-enregistrer">
            {enregistrer.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Enregistrer ma marque
          </Button>
        </>
      )}
    </Card>
  );
}
