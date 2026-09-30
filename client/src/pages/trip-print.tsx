// Carnet de voyage imprimable (A4) : le voyageur l'enregistre en PDF via « Imprimer » du navigateur.
// Fonctionne aussi hors ligne à partir de la copie locale du voyage.
import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { useTripByToken } from "@/hooks/use-trips";

const TYPES: Record<string, string> = {
  activity: "Visite", food: "Repas", hotel: "Hébergement", transport: "Transport", shopping: "Shopping", nightlife: "Soirée",
};

function montant(v: unknown, devise: string) {
  const n = Math.round(Number(v) || 0);
  return n > 0 ? `${n.toLocaleString("fr-FR")} ${devise}` : "";
}

function dateLongue(d?: string | Date | null) {
  if (!d) return "";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "" : x.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

const CSS = `
  @page { size: A4; margin: 14mm 13mm 16mm; }
  .carnet { font-family: "DM Sans", "Inter", system-ui, sans-serif; color: #1a1a1a; background: #fff; font-size: 10.5pt; line-height: 1.45; }
  .carnet h1, .carnet h2, .carnet h3 { font-family: "Playfair Display", Georgia, serif; margin: 0; }
  .ecran { max-width: 210mm; margin: 0 auto; padding: 24px 20px 60px; }
  .barre { position: sticky; top: 0; z-index: 5; display: flex; gap: 8px; justify-content: space-between; align-items: center; padding: 10px 20px; background: #0b1120; color: #fff; font-family: system-ui, sans-serif; font-size: 14px; }
  .barre button, .barre a { display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 10px; padding: 8px 14px; font-weight: 600; cursor: pointer; text-decoration: none; }
  .barre button { background: var(--accent); color: #fff; }
  .barre a { background: transparent; color: #cbd5e1; }
  .couverture { position: relative; border-radius: 14px; overflow: hidden; margin-bottom: 18px; }
  .couverture img { width: 100%; height: 72mm; object-fit: cover; display: block; }
  .couverture .voile { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,.72), rgba(0,0,0,0) 60%); }
  .couverture .texte { position: absolute; left: 16px; right: 16px; bottom: 14px; color: #fff; }
  .couverture h1 { font-size: 26pt; line-height: 1.1; }
  .sans-photo h1 { font-size: 26pt; }
  .resume { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0 18px; }
  .resume div { border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 10px; }
  .resume b { display: block; font-size: 13pt; }
  .resume span { color: #6b7280; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .04em; }
  .jour { break-inside: auto; margin-top: 16px; }
  .jour + .jour { break-before: page; }
  .entete-jour { display: flex; align-items: baseline; gap: 10px; border-bottom: 2px solid var(--c, var(--accent)); padding-bottom: 6px; margin-bottom: 8px; }
  .entete-jour .num { background: var(--c, var(--accent)); color: #fff; border-radius: 999px; padding: 2px 10px; font-weight: 700; font-size: 9pt; font-family: system-ui, sans-serif; }
  .entete-jour h2 { font-size: 16pt; }
  .entete-jour .date { color: #6b7280; margin-left: auto; font-size: 9.5pt; }
  .activite { display: grid; grid-template-columns: 46px 1fr auto; gap: 10px; padding: 7px 0; border-bottom: 1px dashed #e5e7eb; break-inside: avoid; }
  .activite .heure { font-weight: 700; color: var(--accent); }
  .activite .titre { font-weight: 600; }
  .activite .meta { color: #6b7280; font-size: 9pt; }
  .activite .note { font-size: 9.5pt; margin-top: 2px; }
  .activite .resa { font-size: 9pt; margin-top: 2px; }
  .activite .prix { white-space: nowrap; font-weight: 600; }
  .activite img { width: 34mm; height: 22mm; object-fit: cover; border-radius: 6px; }
  .bonplan { display: inline-block; font-size: 8pt; font-weight: 700; color: #b45309; border: 1px solid #f59e0b; border-radius: 999px; padding: 0 6px; margin-left: 6px; }
  .conseils { background: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 6px; padding: 8px 12px; margin-top: 10px; break-inside: avoid; }
  .conseils p { margin: 2px 0; font-size: 9.5pt; }
  .budget-jour { color: #6b7280; font-size: 9pt; margin-top: 6px; }
  .section { break-before: page; }
  .section h2 { font-size: 16pt; border-bottom: 2px solid var(--accent); padding-bottom: 6px; margin-bottom: 10px; }
  .infos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; }
  .infos div { break-inside: avoid; }
  .infos b { display: block; font-size: 8.5pt; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; }
  .check { columns: 2; column-gap: 18px; }
  .check .cat { break-inside: avoid; margin-bottom: 10px; }
  .check h3 { font-size: 11pt; margin-bottom: 4px; }
  .check p { margin: 2px 0; font-size: 9.5pt; }
  .pied { margin-top: 18px; color: #9ca3af; font-size: 8.5pt; text-align: center; }
  .marque { display: flex; align-items: center; gap: 12px; padding: 10px 0 12px; margin-bottom: 14px; border-bottom: 3px solid var(--accent); }
  .marque img { height: 14mm; max-width: 55mm; object-fit: contain; }
  .marque .initiale { width: 12mm; height: 12mm; border-radius: 999px; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14pt; }
  .marque .nom { font-weight: 700; font-size: 12pt; }
  .marque .contact { color: #6b7280; font-size: 8.5pt; }
  .marque .prepare { margin-left: auto; text-align: right; color: #6b7280; font-size: 8.5pt; }
  .contact-fin { margin-top: 16px; border: 1px solid #e5e7eb; border-left: 4px solid var(--accent); border-radius: 10px; padding: 10px 14px; break-inside: avoid; }
  .contact-fin b { display: block; margin-bottom: 2px; }
  .pied-page { display: none; }
  @media print { .pied-page { display: flex; position: fixed; bottom: -9mm; left: 0; right: 0; justify-content: space-between; font-size: 7.5pt; color: #9ca3af; } }
  @media print {
    .barre { display: none !important; }
    .ecran { padding: 0; max-width: none; }
    body { background: #fff !important; }
    .carnet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

export default function TripPrint() {
  const [, params] = useRoute("/share/:token/imprimer");
  const token = params?.token || "";
  const { data: trip, isLoading } = useTripByToken(token);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    if (!trip) return;
    document.title = `${trip.title} - carnet de voyage`;
    if (new URLSearchParams(window.location.search).get("auto") !== "1") return;
    // Attendre les images avant d'ouvrir la boîte d'impression
    const imgs = Array.from(document.images);
    Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })))).then(() => setTimeout(() => window.print(), 300));
  }, [trip]);

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!trip) return <div className="p-10 text-center">Voyage introuvable</div>;

  const devise = trip.currency || "€";
  const org: any = (trip as any).organisateur || {};
  const accent = /^#[0-9a-f]{6}$/i.test(org.couleur || "") ? org.couleur : "#e11d48";
  const contacts = [org.email, org.telephone, (org.siteWeb || "").replace(/^https?:\/\//, "").replace(/\/$/, "")].filter(Boolean);
  const days = [...(trip.days || [])].sort((a: any, b: any) => a.dayNumber - b.dayNumber);
  const nbActivites = days.reduce((s: number, d: any) => s + (d.activities?.length || 0), 0);
  const info: any = trip.travelInfo || {};
  const checklist: any[] = (trip as any).checklistItems || [];
  const parCategorie = checklist.reduce((acc: Record<string, any[]>, it: any) => { (acc[it.category || "Pratique"] ||= []).push(it); return acc; }, {});
  const lienPartage = `${window.location.origin}/share/${token}`;
  const periode = [dateLongue(trip.departureDate), dateLongue(trip.returnDate)].filter(Boolean).join(" au ");

  const lignesInfos: Array<[string, string | undefined]> = [
    ["Urgences", info.emergencyLocal], ["Police", info.emergencyPolice], ["Ambulance", info.emergencyAmbulance],
    ["Pompiers", info.emergencyFire], ["Ambassade", info.embassy], ["Téléphone ambassade", info.embassyPhone],
    ["Décalage horaire", info.timezoneOffset], ["Monnaie", info.localCurrency && `${info.localCurrency}${info.exchangeRate ? ` (1 € ≈ ${info.exchangeRate} ${info.localCurrencySymbol || ""})` : ""}`],
    ["Pourboire", info.tippingCulture], ["Électricité", [info.voltage, info.plugType].filter(Boolean).join(" · ")],
    ["Téléphone et internet", info.simWifi], ["Notes", info.customNotes],
  ];
  const infosRemplies = lignesInfos.filter(([, v]) => v && String(v).trim());

  return (
    <div className="carnet" style={{ minHeight: "100vh", ["--accent" as any]: accent }}>
      <style>{CSS}</style>
      <div className="barre">
        <Link href={`/share/${token}`}><ArrowLeft size={16} /> Retour au voyage</Link>
        <button onClick={() => window.print()} data-testid="button-print"><Printer size={16} /> Enregistrer en PDF</button>
      </div>

      <div className="ecran">
        {org.nom && (
          <div className="marque" data-testid="print-marque">
            {org.logo ? <img src={org.logo} alt={org.nom} /> : <div className="initiale">{org.nom.slice(0, 1).toUpperCase()}</div>}
            <div>
              <div className="nom">{org.nom}</div>
              {contacts.length > 0 && <div className="contact">{contacts.join(" · ")}</div>}
            </div>
            <div className="prepare">Carnet de voyage<br />préparé pour vous</div>
          </div>
        )}
        {trip.coverImageUrl ? (
          <div className="couverture">
            <img src={trip.coverImageUrl} alt="" />
            <div className="voile" />
            <div className="texte">
              <h1>{trip.coverEmoji} {trip.title}</h1>
              {trip.subtitle && <p style={{ margin: "4px 0 0" }}>{trip.subtitle}</p>}
            </div>
          </div>
        ) : (
          <div className="sans-photo" style={{ marginBottom: 12 }}>
            <h1>{trip.coverEmoji} {trip.title}</h1>
            {trip.subtitle && <p style={{ margin: "4px 0 0", color: "#6b7280" }}>{trip.subtitle}</p>}
          </div>
        )}

        <div className="resume">
          <div><b>{days.length}</b><span>jours</span></div>
          <div><b>{nbActivites}</b><span>activités</span></div>
          <div><b>{trip.travelers || "-"}</b><span>voyageurs</span></div>
          <div><b>{montant(trip.totalBudget, devise) || "-"}</b><span>budget</span></div>
        </div>
        {(trip.destination || periode) && <p style={{ margin: "0 0 4px" }}><b>{trip.destination}</b>{periode && ` · du ${periode}`}</p>}
        {trip.welcomeText && <p style={{ margin: "0 0 8px", color: "#374151" }}>{trip.welcomeText}</p>}

        {days.map((d: any) => {
          const b = d.budget || {};
          const totalJour = ["hotel", "food", "transport", "activities", "other"].reduce((s, k) => s + (Number(b[k]) || 0), 0);
          return (
            <section className="jour" key={d.id}>
              <div className="entete-jour">
                <span className="num">Jour {d.dayNumber}</span>
                <h2>{d.city}</h2>
                <span className="date">{d.dateLabel}</span>
              </div>
              {(d.activities || []).map((a: any) => (
                <div className="activite" key={a.id}>
                  <div className="heure">{a.time}</div>
                  <div>
                    <div className="titre">{a.title}{a.isPersonal && <span className="bonplan">Bon plan</span>}</div>
                    <div className="meta">{[TYPES[a.type] || "", a.duration, a.address].filter(Boolean).join(" · ")}</div>
                    {a.note && <div className="note">{a.note}</div>}
                    {(a.confirmationNumber || a.phone || a.checkoutTime) && (
                      <div className="resa">
                        {a.confirmationNumber && <>Réservation : <b>{a.confirmationNumber}</b> </>}
                        {a.phone && <>· Tél. {a.phone} </>}
                        {a.checkoutTime && <>· Départ {a.checkoutTime}</>}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {a.imageUrl && <img src={a.imageUrl} alt="" />}
                    <div className="prix">{montant(a.cost, devise)}</div>
                  </div>
                </div>
              ))}
              {(d.tips || []).length > 0 && (
                <div className="conseils">{d.tips.map((t: any) => <p key={t.id}>• {t.content}</p>)}</div>
              )}
              {totalJour > 0 && <p className="budget-jour">Budget du jour : {montant(totalJour, devise)}</p>}
            </section>
          );
        })}

        {infosRemplies.length > 0 && (
          <section className="section">
            <h2>Infos pratiques</h2>
            <div className="infos">
              {infosRemplies.map(([k, v]) => <div key={k}><b>{k}</b>{v}</div>)}
            </div>
          </section>
        )}

        {checklist.length > 0 && (
          <section className="section">
            <h2>Checklist</h2>
            <div className="check">
              {Object.entries(parCategorie).map(([cat, items]) => (
                <div className="cat" key={cat}>
                  <h3>{cat}</h3>
                  {(items as any[]).map((it) => <p key={it.id}>☐ {it.text}{it.isCritical ? " (essentiel)" : ""}</p>)}
                </div>
              ))}
            </div>
          </section>
        )}

        {org.nom && (contacts.length > 0 || org.whatsapp || org.signature) && (
          <div className="contact-fin">
            <b>Votre contact pendant le voyage : {org.nom}</b>
            {org.signature && <div>{org.signature}</div>}
            {contacts.length > 0 && <div>{contacts.join(" · ")}</div>}
            {org.whatsapp && <div>WhatsApp : {org.whatsapp}</div>}
          </div>
        )}
        <p className="pied">Carnet à jour en ligne : {lienPartage}{!org.marqueBlanche && <> · Réalisé avec Voyageo</>}</p>
        <div className="pied-page"><span>{org.nom ? org.nom + " · " : ""}{trip.title}</span><span>{org.marqueBlanche ? "" : "Réalisé avec Voyageo"}</span></div>
      </div>
    </div>
  );
}
