import { useTripByToken } from "@/hooks/use-trips";
import { useRoute } from "wouter";
import { Loader2, Calendar, MapPin, Lightbulb, Flame, BarChart3, CheckSquare, Clock, Moon, Sun, Check, Download, Home, Map as MapIcon, Users, Wallet, Plane, Hotel, UtensilsCrossed, ShoppingBag, Bus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Zap, PartyPopper, Camera, Sparkles, ExternalLink, Navigation, Info, Phone, Globe, Banknote, Plug, Wifi, ArrowRightLeft, Shield, FileText, Copy, Hash, Star, Link2 } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TripMap } from "@/components/trip-map";
import { WeatherWidget } from "@/components/weather-widget";
import { Card } from "@/components/ui/card";
import BudgetSection from "@/components/budget-section";
import type { LocalExpense } from "@/lib/budget-utils";

function BottomNav({ tab, setTab }: { tab: string, setTab: (t: string) => void }) {
  const tabs = [
    { id: "accueil", label: "Accueil", icon: Home },
    { id: "carte", label: "Carte", icon: MapIcon },
    { id: "jours", label: "Jours", icon: Calendar },
    { id: "budget", label: "Budget", icon: Wallet },
    { id: "check", label: "Check", icon: CheckSquare },
    { id: "infos", label: "Infos", icon: Info },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1d23] dark:bg-[#1a1d23] border-t border-white/5">
      <div className="mobile-shell flex items-end justify-around gap-1 py-2 px-2">
        {tabs.map(t => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex flex-col items-center gap-1 py-1 min-w-[56px] relative"
              data-testid={`nav-${t.id}`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? "bg-primary shadow-lg shadow-primary/30 -translate-y-1 scale-110"
                    : ""
                }`}
              >
                <t.icon className={`w-5 h-5 transition-colors ${
                  isActive ? "text-white" : "text-[#6b7280]"
                }`} />
              </div>
              <span className={`text-[10px] font-semibold transition-colors ${
                isActive ? "text-white" : "text-[#6b7280]"
              }`}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CountdownCard({ departureDate }: { departureDate: string | null }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!departureDate) return null;

  const departure = new Date(departureDate);
  departure.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const diffMs = departure.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return (
      <Card className="p-4 text-center relative overflow-visible" data-testid="card-countdown">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Plane className="w-5 h-5 text-primary" />
          <p className="text-sm font-bold text-primary">En voyage !</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Jour {absDays + 1} de votre aventure
        </p>
      </Card>
    );
  }

  if (diffDays === 0) {
    return (
      <Card className="p-5 text-center relative overflow-visible" data-testid="card-countdown">
        <div className="flex items-center justify-center gap-2 mb-2">
          <PartyPopper className="w-6 h-6 text-primary animate-bounce" />
          <p className="text-lg font-display font-bold text-primary">C'est le grand jour !</p>
          <PartyPopper className="w-6 h-6 text-primary animate-bounce" />
        </div>
        <p className="text-sm text-muted-foreground">Bon voyage et belles découvertes</p>
      </Card>
    );
  }

  const midnight = new Date(today);
  midnight.setDate(midnight.getDate() + 1);
  const remainingMs = midnight.getTime() - now.getTime();
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <Card className="p-5 text-center relative overflow-visible" data-testid="card-countdown">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Plane className="w-5 h-5 text-primary" />
        <p className="text-sm font-bold text-foreground">
          J-{diffDays} avant le départ
        </p>
        <PartyPopper className="w-5 h-5 text-accent" />
      </div>

      <div className="flex items-center justify-center gap-2" data-testid="countdown-timer">
        {[
          { value: diffDays, label: "Jours" },
          { value: hours, label: "Heures" },
          { value: minutes, label: "Min" },
          { value: seconds, label: "Sec" },
        ].map((unit) => (
          <div key={unit.label} className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-md bg-primary/10 dark:bg-primary/15 flex items-center justify-center mb-1">
              <span className="text-xl font-bold text-primary font-mono tabular-nums" data-testid={`countdown-${unit.label.toLowerCase()}`}>
                {pad(unit.value)}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">{unit.label}</span>
          </div>
        ))}
      </div>

      {diffDays <= 7 && (
        <p className="text-xs text-primary/80 font-medium mt-3 animate-pulse">
          Plus que quelques jours...
        </p>
      )}
    </Card>
  );
}

function AccommodationAccordion({ days, currency }: { days: any[], currency: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const hotels = days.flatMap((day: any) =>
    (day.activities || [])
      .filter((a: any) => a.type === "hotel")
      .map((a: any) => ({ ...a, dayNumber: day.dayNumber, city: day.city }))
  );

  if (hotels.length === 0) return null;

  const totalNights = hotels.reduce((sum: number, h: any) => sum + (h.nights || 1), 0);

  return (
    <div data-testid="accordion-accommodations">
      <Card
        className="p-4 cursor-pointer hover-elevate"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="btn-toggle-accommodations"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <Hotel className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-foreground" data-testid="text-accommodations-title">Hébergements</p>
              <p className="text-xs text-muted-foreground" data-testid="text-accommodations-summary">{hotels.length} hôtel{hotels.length > 1 ? "s" : ""} · {totalNights} nuit{totalNights > 1 ? "s" : ""} au total</p>
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-amber-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-amber-500" />
          )}
        </div>
      </Card>

      {isOpen && (
        <div className="mt-2 space-y-3">
          {hotels.map((hotel: any) => (
            <Card key={hotel.id} className="p-4 border-border/60" data-testid={`card-hotel-${hotel.id}`}>
              <div className="flex items-start justify-between mb-1">
                <h4 className="font-bold text-sm text-foreground" data-testid={`text-hotel-name-${hotel.id}`}>{hotel.title}</h4>
                <Badge variant="outline" className="text-[10px] bg-orange-500/20 text-orange-400 border-orange-500/30 shrink-0 ml-2" data-testid={`badge-hotel-nights-${hotel.id}`}>
                  {hotel.nights || 1} nuit{(hotel.nights || 1) > 1 ? "s" : ""}
                </Badge>
              </div>
              {hotel.address && (
                <p className="text-xs text-muted-foreground mb-2" data-testid={`text-hotel-address-${hotel.id}`}>{hotel.address}</p>
              )}
              {hotel.note && (
                <p className="text-xs text-muted-foreground/80 mb-2 italic" data-testid={`text-hotel-note-${hotel.id}`}>{hotel.note}</p>
              )}
              <div className="flex items-center justify-between mb-3">
                {hotel.rating && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-semibold text-foreground" data-testid={`text-hotel-rating-${hotel.id}`}>{hotel.rating}</span>
                    {hotel.reviewCount && (
                      <span className="text-xs text-muted-foreground" data-testid={`text-hotel-reviews-${hotel.id}`}>({hotel.reviewCount})</span>
                    )}
                  </div>
                )}
                {hotel.priceRange && (
                  <p className="text-xs font-semibold text-primary" data-testid={`text-hotel-price-${hotel.id}`}>{hotel.priceRange}</p>
                )}
              </div>
              <div className="flex gap-2">
                {hotel.bookingUrl && (
                  <a
                    href={hotel.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-teal-500/10 text-teal-500 dark:text-teal-400 text-xs font-medium border border-teal-500/20 hover-elevate"
                    data-testid={`link-booking-${hotel.id}`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Booking.com
                  </a>
                )}
                {(hotel.googleMapsUrl || hotel.address) && (
                  <a
                    href={hotel.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address || hotel.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-500/10 text-red-500 dark:text-red-400 text-xs font-medium border border-red-500/20 hover-elevate"
                    data-testid={`link-maps-${hotel.id}`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Google Maps
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ClientAccueil({ trip }: { trip: any }) {
  const days = trip.days || [];
  const totalDays = days.length;
  const totalActivities = days.reduce((sum: number, d: any) => sum + (d.activities?.length || 0), 0);

  const categories = ["hotel", "food", "transport", "activities", "other"];
  let totalSpent = 0;
  days.forEach((day: any) => {
    if (day.budget) categories.forEach(c => { totalSpent += parseFloat(day.budget[c] || "0"); });
  });

  const lieuxEnPhoto = days
    .flatMap((d: any) => (d.activities || []).map((a: any) => ({ ...a, dayNumber: d.dayNumber, city: d.city })))
    .filter((a: any) => typeof a.imageUrl === "string" && a.imageUrl.startsWith("https://"))
    .slice(0, 12);

  return (
    <div className="pb-24 space-y-3">
      {trip.coverImageUrl && (
        <div className="relative overflow-hidden rounded-2xl aspect-[16/9] bg-muted" data-testid="hero-cover">
          <img src={trip.coverImageUrl} alt={trip.destination || trip.title} className="absolute inset-0 w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-white font-display font-bold text-xl leading-tight drop-shadow">{trip.title}</p>
            {trip.subtitle && <p className="text-white/85 text-xs mt-1 line-clamp-2">{trip.subtitle}</p>}
          </div>
        </div>
      )}

      <CountdownCard departureDate={trip.departureDate} />

      {lieuxEnPhoto.length > 0 && (
        <Card className="p-4" data-testid="card-highlights">
          <p className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" /> À ne pas manquer
          </p>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-1 px-1 pb-1">
            {lieuxEnPhoto.map((a: any) => (
              <div key={a.id} className="snap-start shrink-0 w-40">
                <div className="relative w-40 h-28 rounded-xl overflow-hidden bg-muted">
                  <img
                    src={a.imageUrl}
                    alt={a.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget.parentElement?.parentElement as HTMLElement).style.display = "none"; }}
                  />
                  <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold bg-black/60 text-white rounded-full px-2 py-0.5">J{a.dayNumber}</span>
                </div>
                <p className="text-xs font-medium text-foreground mt-1.5 line-clamp-2 leading-snug">{a.title}</p>
                <p className="text-[10px] text-muted-foreground">{a.city}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center" data-testid="card-stat-days">
          <Calendar className="w-5 h-5 mx-auto mb-1.5 text-primary" />
          <p className="text-lg font-bold text-foreground" data-testid="text-stat-days">{totalDays}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Jours</p>
        </Card>
        <Card className="p-3 text-center" data-testid="card-stat-activities">
          <Clock className="w-5 h-5 mx-auto mb-1.5 text-teal-500" />
          <p className="text-lg font-bold text-foreground" data-testid="text-stat-activities">{totalActivities}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Activités</p>
        </Card>
        <Card className="p-3 text-center" data-testid="card-stat-budget">
          <Wallet className="w-5 h-5 mx-auto mb-1.5 text-accent" />
          <p className="text-lg font-bold text-foreground" data-testid="text-stat-budget">{trip.currency}{((trip.budgetHotel || 0) + (trip.budgetFood || 0) + (trip.budgetTransport || 0) + (trip.budgetActivities || 0) + (trip.budgetOther || 0)) || trip.totalBudget || 0}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Budget</p>
        </Card>
      </div>

      {trip.travelers && (
        <Card className="p-4 flex items-center gap-3" data-testid="card-travelers">
          <Users className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium">{trip.travelers} voyageur{trip.travelers > 1 ? "s" : ""}</p>
            <p className="text-xs text-muted-foreground">Pour ce voyage</p>
          </div>
        </Card>
      )}

      <AccommodationAccordion days={days} currency={trip.currency || "€"} />

      {trip.destination && <WeatherWidget destination={trip.destination} />}

      {trip.guideUrl && (
        <a href={trip.guideUrl} target="_blank" rel="noopener noreferrer" className="block" data-testid="link-accueil-guide">
          <Card className="p-4 flex items-center gap-3 hover-elevate cursor-pointer" data-testid="card-guide-download">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Guide de voyage</p>
              <p className="text-xs text-muted-foreground">Télécharger le guide PDF</p>
            </div>
          </Card>
        </a>
      )}

      {(trip.documents?.length > 0) && (
        <Card className="p-4" data-testid="card-documents-shortcut">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Documents de voyage
          </h3>
          <div className="space-y-2">
            {trip.documents.slice(0, 4).map((doc: any) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2.5 rounded-md bg-muted/50 hover-elevate"
                data-testid={`link-doc-shortcut-${doc.id}`}
              >
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  {documentTypeIcon(doc.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-[10px] text-muted-foreground">{documentTypeLabel(doc.type)}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </a>
            ))}
            {trip.documents.length > 4 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{trip.documents.length - 4} document{trip.documents.length - 4 > 1 ? "s" : ""} dans l'onglet Infos
              </p>
            )}
          </div>
        </Card>
      )}

      {days.length > 0 && (
        <Card className="p-4" data-testid="card-cities">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Villes visitées
          </h3>
          <div className="flex flex-wrap gap-2">
            {days.map((day: any) => (
              <Badge key={day.id} variant="secondary" className="gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: day.color || "#FF6B6B" }} />
                J{day.dayNumber} &ndash; {day.city}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function documentTypeIcon(type: string) {
  const iconClass = "w-4 h-4 text-primary";
  switch (type) {
    case "flight": return <Plane className={iconClass} />;
    case "hotel": return <Hotel className={iconClass} />;
    case "transport": return <Bus className={iconClass} />;
    case "insurance": return <Shield className={iconClass} />;
    case "identity": return <FileText className={iconClass} />;
    case "activity": return <Camera className={iconClass} />;
    default: return <FileText className={iconClass} />;
  }
}

function documentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    flight: "Vol",
    hotel: "Hébergement",
    transport: "Transport",
    insurance: "Assurance",
    identity: "Identité",
    activity: "Activité",
    other: "Autre",
  };
  return labels[type] || "Document";
}

function toGoogleMyMapsEmbed(url: string): string {
  try {
    const u = new URL(url);
    const mid = u.searchParams.get("mid");
    if (mid) {
      return `https://www.google.com/maps/d/embed?mid=${mid}&ehbc=2E312F`;
    }
    if (u.pathname.includes("/maps/d/")) {
      const embedUrl = url.replace("/edit", "/embed").replace("/viewer", "/embed").replace("/view", "/embed");
      return embedUrl.includes("/embed") ? embedUrl : url;
    }
    return url;
  } catch {
    return url;
  }
}

function ClientCarte({ days, googleMyMapsUrl }: { days: any[], googleMyMapsUrl?: string | null }) {
  const cityMap: Record<string, boolean> = {};
  days.forEach((d: any) => { cityMap[d.city] = true; });
  const cities = Object.keys(cityMap);
  const totalMarkers = days.reduce((sum: number, d: any) => sum + (d.activities || []).filter((a: any) => a.latitude && a.longitude).length, 0);

  return (
    <div className="pb-24 space-y-4">
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <MapIcon className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-lg font-display font-bold text-foreground" data-testid="text-carte-title">Carte interactive</h2>
        <p className="text-xs text-muted-foreground mt-1" data-testid="text-carte-subtitle">
          {googleMyMapsUrl
            ? "Votre carte personnalisée Google My Maps"
            : `${totalMarkers} point${totalMarkers > 1 ? "s" : ""} sur ${cities.length} ville${cities.length > 1 ? "s" : ""}`
          }
        </p>
      </div>

      {googleMyMapsUrl ? (
        <Card className="overflow-hidden" data-testid="card-google-my-maps">
          <iframe
            src={toGoogleMyMapsEmbed(googleMyMapsUrl)}
            className="w-full border-0"
            style={{ height: "calc(100vh - 300px)" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Google My Maps"
            data-testid="iframe-google-my-maps"
          />
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden" data-testid="card-map-container">
            <TripMap days={days} className="[&_div[data-testid='trip-map']]:h-[calc(100vh-320px)] [&_div[data-testid='trip-map']]:rounded-none [&_div[data-testid='trip-map']]:border-0" />
          </Card>

          {days.length > 0 && (
            <Card className="p-4" data-testid="card-map-legend">
              <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-3">Légende par jour</h3>
              <div className="grid grid-cols-2 gap-2">
                {days.map((day: any) => {
                  const markerCount = (day.activities || []).filter((a: any) => a.latitude && a.longitude).length;
                  if (markerCount === 0) return null;
                  return (
                    <div key={day.id} className="flex items-center gap-2 text-sm" data-testid={`legend-day-${day.dayNumber}`}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: day.color || "#FF6B6B" }}>
                        {day.dayNumber}
                      </div>
                      <span className="text-xs text-foreground truncate">{day.city}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{markerCount} pt{markerCount > 1 ? "s" : ""}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function getActivityIcon(type: string) {
  switch (type) {
    case "food": return UtensilsCrossed;
    case "transport": return Plane;
    case "hotel": return Hotel;
    case "shopping": return ShoppingBag;
    case "nightlife": return PartyPopper;
    default: return Camera;
  }
}

function getActivityIconBg(type: string) {
  switch (type) {
    case "food": return "bg-orange-500/15 text-orange-500";
    case "transport": return "bg-blue-500/15 text-blue-500";
    case "hotel": return "bg-purple-500/15 text-purple-500";
    case "shopping": return "bg-pink-500/15 text-pink-500";
    case "nightlife": return "bg-violet-500/15 text-violet-500";
    default: return "bg-emerald-500/15 text-emerald-500";
  }
}

function DayWeatherInline({ city }: { city: string }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/weather", city],
    queryFn: async () => {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!city,
    staleTime: 1000 * 60 * 30,
    retry: false,
  });

  if (isLoading || !data) return null;

  const getSmallIcon = (pictocode: string) => {
    const code = parseInt(pictocode, 10);
    if (code === 1) return <Sun className="w-6 h-6 text-yellow-400" />;
    if (code <= 4) return <Sun className="w-6 h-6 text-yellow-300" />;
    return <Sun className="w-6 h-6 text-gray-400" />;
  };

  return (
    <div className="bg-card/60 border border-border/30 rounded-md px-3 py-2 flex items-center gap-2 shrink-0" data-testid="day-weather">
      {getSmallIcon(data.icon)}
      <div>
        <p className="text-sm font-bold">{data.temperature}&deg;C</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{data.description} &middot; {data.windSpeed}km/h</p>
      </div>
    </div>
  );
}

function getCityIcon(city: string) {
  const lower = city.toLowerCase();
  if (lower.includes("bangkok")) return Hotel;
  if (lower.includes("ayutthaya")) return Camera;
  if (lower.includes("chiang")) return MapPin;
  if (lower.includes("koh") || lower.includes("phangan") || lower.includes("tao")) return Navigation;
  if (lower.includes("krabi") || lower.includes("phuket")) return Navigation;
  return MapPin;
}

function hasHotelDetails(a: any): boolean {
  return !!(a.address || a.checkoutTime || a.confirmationNumber || a.imageUrl || a.phone);
}

function HotelCard({ activity, dayColor }: { activity: any; dayColor: string }) {
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasImage = activity.imageUrl && !imgError;

  const copyConfirmation = useCallback(() => {
    if (activity.confirmationNumber) {
      navigator.clipboard.writeText(activity.confirmationNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [activity.confirmationNumber]);

  const addressLink = activity.googleMapsUrl || (activity.latitude && activity.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${activity.latitude},${activity.longitude}`
    : null);

  const showCheckinOut = activity.time || activity.checkoutTime;

  return (
    <Card className="overflow-visible" data-testid={`hotel-card-${activity.id}`}>
      {hasImage && (
        <div className="relative">
          <img
            src={activity.imageUrl}
            alt={activity.title}
            className="h-36 w-full object-cover rounded-t-md"
            onError={() => setImgError(true)}
          />
          <Badge className="absolute bottom-2 right-2 bg-purple-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full no-default-active-elevate no-default-hover-elevate">
            <Hotel className="w-3 h-3 mr-1" />
            Hébergement
          </Badge>
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0">
            <Hotel className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground">{activity.title}</p>
            {activity.note && (
              <p className="text-xs text-muted-foreground mt-0.5">{activity.note}</p>
            )}
          </div>
        </div>

        {(activity.address || addressLink) && (
          <div data-testid={`hotel-address-${activity.id}`}>
            {addressLink ? (
              <a
                href={addressLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">{activity.address || "Voir sur Google Maps"}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{activity.address}</span>
              </div>
            )}
          </div>
        )}

        {showCheckinOut && (
          <div className="flex gap-3">
            {activity.time && (
              <div className="flex-1 bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CHECK-IN</p>
                <p className="text-lg font-bold text-foreground">{activity.time}</p>
              </div>
            )}
            {activity.checkoutTime && (
              <div className="flex-1 bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CHECK-OUT</p>
                <p className="text-lg font-bold text-foreground">{activity.checkoutTime}</p>
              </div>
            )}
          </div>
        )}

        {(activity.confirmationNumber || activity.phone) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {activity.confirmationNumber && (
              <div className="flex items-center gap-1.5" data-testid={`hotel-confirmation-${activity.id}`}>
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-mono text-foreground">{activity.confirmationNumber}</span>
                <button onClick={copyConfirmation} className="p-0.5 rounded hover-elevate">
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                </button>
              </div>
            )}
            {activity.phone && (
              <a href={`tel:${activity.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid={`hotel-phone-${activity.id}`}>
                <Phone className="w-3.5 h-3.5" />
                <span>{activity.phone}</span>
              </a>
            )}
          </div>
        )}

        {activity.bookingUrl && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.open(activity.bookingUrl, '_blank')}
            data-testid={`hotel-booking-${activity.id}`}
          >
            Voir la réservation
            <ExternalLink className="w-3.5 h-3.5 ml-2" />
          </Button>
        )}
      </div>
    </Card>
  );
}

function ClientJours({ days }: { days: any[] }) {
  const [selectedDay, setSelectedDay] = useState(0);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<number | null>(null);

  const cities = useMemo(() => {
    const unique: string[] = [];
    days.forEach(d => {
      if (!unique.includes(d.city)) unique.push(d.city);
    });
    return unique;
  }, [days]);

  const filteredDays = useMemo(() => {
    if (!cityFilter) return days;
    return days.filter(d => d.city === cityFilter);
  }, [days, cityFilter]);

  useEffect(() => {
    setSelectedDay(0);
  }, [cityFilter]);

  const currentDay = filteredDays[selectedDay] || filteredDays[0];
  if (!currentDay) return null;

  const handleSwipe = (dir: number) => {
    const newIdx = selectedDay + dir;
    if (newIdx >= 0 && newIdx < filteredDays.length) {
      setSelectedDay(newIdx);
      setExpandedActivity(null);
    }
  };

  const canPrev = selectedDay > 0;
  const canNext = selectedDay < filteredDays.length - 1;
  const dayColor = currentDay.color || "#FF6B6B";
  const activityCount = currentDay.activities?.length || 0;

  return (
    <div className="pb-24 space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1" data-testid="filter-cities">
        <button
          onClick={() => setCityFilter(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            !cityFilter
              ? "bg-primary text-white border-primary"
              : "bg-card border-border/50 text-muted-foreground"
          }`}
          data-testid="filter-city-all"
        >
          Tout
        </button>
        {cities.map(city => {
          const cityDays = days.filter(d => d.city === city);
          const cityColor = cityDays[0]?.color || "#FF6B6B";
          const isActive = cityFilter === city;
          const CityIcon = getCityIcon(city);
          return (
            <button
              key={city}
              onClick={() => setCityFilter(isActive ? null : city)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                isActive
                  ? "text-white border-transparent"
                  : "bg-card border-border/50 text-foreground"
              }`}
              style={isActive ? { backgroundColor: cityColor, borderColor: cityColor } : undefined}
              data-testid={`filter-city-${city.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <CityIcon className="w-3 h-3" />
              {city}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1" data-testid="filter-days">
        {filteredDays.map((day: any, idx: number) => {
          const isActive = idx === selectedDay;
          const CityIcon = getCityIcon(day.city);
          return (
            <button
              key={day.id}
              onClick={() => { setSelectedDay(idx); setExpandedActivity(null); }}
              className={`shrink-0 flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all min-w-[44px] border ${
                isActive
                  ? "border-transparent shadow-lg"
                  : "border-border/30 bg-card"
              }`}
              style={isActive ? { background: `linear-gradient(135deg, ${day.color || "#FF6B6B"}, ${day.color || "#FF6B6B"}dd)` } : undefined}
              data-testid={`filter-day-${day.dayNumber}`}
            >
              <CityIcon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-muted-foreground"}`} />
              <span className={`text-[10px] font-bold ${isActive ? "text-white" : "text-muted-foreground"}`}>{day.dateLabel}</span>
            </button>
          );
        })}
      </div>

      <Card className="p-4 relative overflow-hidden" data-testid="card-day-header">
        <div className="absolute inset-0 opacity-[0.07]" style={{ background: `linear-gradient(135deg, ${dayColor}, ${dayColor}88)` }} />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-display font-bold" data-testid="text-day-title">
              Jour {currentDay.dayNumber} &mdash; {currentDay.city}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5" data-testid="text-day-info">
              {currentDay.dateLabel} &middot; {activityCount} activité{activityCount > 1 ? "s" : ""}
            </p>
          </div>
          <DayWeatherInline city={currentDay.city} />
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleSwipe(-1)}
          disabled={!canPrev}
          className="text-muted-foreground"
          data-testid="button-prev-day"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <p className="text-center text-[10px] text-muted-foreground/50">&larr; swipe pour changer de jour &rarr;</p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleSwipe(1)}
          disabled={!canNext}
          className="text-muted-foreground"
          data-testid="button-next-day"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div
        className="relative"
        onTouchStart={(e) => {
          const startX = e.touches[0].clientX;
          const el = e.currentTarget;
          const handleEnd = (ev: TouchEvent) => {
            const diff = startX - ev.changedTouches[0].clientX;
            if (Math.abs(diff) > 60) handleSwipe(diff > 0 ? 1 : -1);
            el.removeEventListener("touchend", handleEnd);
          };
          el.addEventListener("touchend", handleEnd);
        }}
      >
        {(() => {
          const allActivities = currentDay.activities || [];
          const hotelWithDetails = allActivities.filter((a: any) => a.type === "hotel" && hasHotelDetails(a));
          const remaining = allActivities.filter((a: any) => !(a.type === "hotel" && hasHotelDetails(a)));
          return hotelWithDetails.length > 0 ? (
            <div className="space-y-2 mb-2">
              {hotelWithDetails.map((a: any) => (
                <HotelCard key={a.id} activity={a} dayColor={dayColor} />
              ))}
            </div>
          ) : null;
        })()}

        <div className="absolute left-[11px] top-3 bottom-3 w-[2px] rounded-full opacity-25" style={{ backgroundColor: dayColor }} />

        <div className="space-y-2">
          {(currentDay.activities || []).filter((a: any) => !(a.type === "hotel" && hasHotelDetails(a))).map((a: any, idx: number) => {
            const TypeIcon = a.isPersonal ? Flame : getActivityIcon(a.type || "activity");
            const iconBg = a.isPersonal ? "bg-orange-500/15 text-orange-500" : getActivityIconBg(a.type || "activity");
            const isExpanded = expandedActivity === a.id;
            const cost = parseFloat(a.cost || "0");
            const remainingActs = (currentDay.activities || []).filter((a2: any) => !(a2.type === "hotel" && hasHotelDetails(a2)));
            const isLast = idx === remainingActs.length - 1;

            return (
              <div
                key={a.id}
                className="relative flex items-start gap-0"
                data-testid={`client-activity-${a.id}`}
              >
                <div className="flex flex-col items-center mr-3 pt-4 z-10">
                  <div
                    className="w-[10px] h-[10px] rounded-full shrink-0 border-2"
                    style={{ backgroundColor: dayColor, borderColor: dayColor }}
                  />
                </div>

                <div
                  className={`flex-1 rounded-md border p-3 cursor-pointer transition-all ${
                    a.isPersonal
                      ? "bg-orange-500/5 border-orange-500/20 dark:bg-orange-500/[0.08]"
                      : "bg-card border-border/40"
                  }`}
                  onClick={() => setExpandedActivity(isExpanded ? null : a.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${iconBg}`}>
                      <TypeIcon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold" style={{ color: dayColor }}>{a.time}</span>
                        {cost > 0 && (
                          <span className="text-[11px] text-muted-foreground font-medium">{cost}&euro;</span>
                        )}
                      </div>
                      <p className="font-semibold text-sm mt-0.5">{a.title}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                  </div>

                  {a.isPersonal && (
                    <div className="mt-2">
                      <Badge className="text-[9px] px-1.5 py-0 bg-red-500/15 text-red-400 border-red-500/25 no-default-active-elevate" data-testid={`badge-bon-plan-${a.id}`}>
                        <Flame className="w-2.5 h-2.5 mr-0.5" />
                        BON PLAN PERSO
                      </Badge>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/20 space-y-3">
                      {a.note && (
                        <div className={`rounded-md p-3 flex items-start gap-2 ${
                          a.isPersonal
                            ? "bg-red-500/10 border border-red-500/15"
                            : "bg-amber-500/10 border border-amber-500/15"
                        }`} data-testid={`note-${a.id}`}>
                          <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${a.isPersonal ? "text-red-400" : "text-amber-400"}`} />
                          <p className={`text-xs leading-relaxed ${a.isPersonal ? "text-red-300 dark:text-red-300" : "text-amber-200 dark:text-amber-200"}`}>
                            {a.note}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {a.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{a.duration}</span>
                          </div>
                        )}
                        {cost > 0 && (
                          <div className="flex items-center gap-1">
                            <Wallet className="w-3 h-3" />
                            <span>{cost}&euro;/pers</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {(a.googleMapsUrl || (a.latitude && a.longitude)) && (
                          <a
                            href={a.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-white no-underline"
                            style={{ backgroundColor: "#4285F4" }}
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`link-gmaps-${a.id}`}
                          >
                            <Navigation className="w-3 h-3" />
                            Google Maps
                          </a>
                        )}
                        {a.bookingUrl && (
                          <a
                            href={a.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold bg-primary/15 text-primary border border-primary/25 no-underline"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`link-booking-${a.id}`}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Réserver
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {currentDay.tips && currentDay.tips.length > 0 && (
        <Card className="p-4 bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-500/[0.08]" data-testid="day-tips">
          <h4 className="text-sm font-bold flex items-center gap-2 mb-3 text-emerald-400">
            <Zap className="w-4 h-4" />
            Tips du jour
          </h4>
          <div className="space-y-2">
            {currentDay.tips.map((tip: any) => (
              <div key={tip.id} className="flex items-start gap-2.5 text-sm" data-testid={`day-tip-${tip.id}`}>
                <div className="w-1 shrink-0 self-stretch rounded-full bg-emerald-500/40" />
                <span className="text-muted-foreground leading-relaxed">{tip.content}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function useLocalExpenses(token: string) {
  const storageKey = `expenses_${token}`;

  const [expenses, setExpenses] = useState<LocalExpense[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(expenses));
  }, [expenses, storageKey]);

  const addExpense = useCallback((data: { dayNumber: number; category: string; amount: string; note: string; paidBy?: string; splitWith?: string[] }) => {
    const newExpense: LocalExpense = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      dayNumber: data.dayNumber,
      category: data.category,
      amount: data.amount,
      note: data.note || null,
      createdAt: new Date().toISOString(),
      paidBy: data.paidBy,
      splitWith: data.splitWith,
    };
    setExpenses(prev => [...prev, newExpense]);
  }, []);

  const deleteExpense = useCallback((id: string | number) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  return { expenses, addExpense, deleteExpense };
}

function ClientBudget({ trip, token }: { trip: any; token: string }) {
  const { expenses, addExpense, deleteExpense } = useLocalExpenses(token);
  const participants: string[] = trip.participants || [];

  return (
    <div className="pb-24">
      <BudgetSection
        trip={trip}
        expenses={expenses}
        currency={trip.currency || "\u20ac"}
        onAddExpense={addExpense}
        onDeleteExpense={deleteExpense}
        dayCount={(trip.days || []).length}
        participants={participants}
      />
    </div>
  );
}

function useLocalChecklist(token: string) {
  const storageKey = `checklist_${token}`;

  const [checkedIds, setCheckedIds] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(checkedIds)));
  }, [checkedIds, storageKey]);

  const toggle = useCallback((itemId: number) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const isChecked = useCallback((itemId: number) => checkedIds.has(itemId), [checkedIds]);

  return { isChecked, toggle, checkedCount: checkedIds.size };
}

const PHASE_CONFIG = {
  before: { title: "Bien avant le départ", icon: Calendar, colorClass: "text-blue-500", bgClass: "bg-blue-500/10", borderClass: "border-blue-500/20", badgeClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  week: { title: "La semaine avant", icon: Clock, colorClass: "text-amber-500", bgClass: "bg-amber-500/10", borderClass: "border-amber-500/20", badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  pack: { title: "Dans la valise", icon: ShoppingBag, colorClass: "text-emerald-500", bgClass: "bg-emerald-500/10", borderClass: "border-emerald-500/20", badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
} as const;

const SUBCATEGORY_LABELS: Record<string, string> = {
  essentiels: "Essentiels",
  vetements: "Vêtements",
  toilette: "Toilette & Santé",
  tech: "Tech & Connectivité",
  confort: "Confort voyage",
};

function ChecklistItemRow({ item, checked, onToggle }: { item: any, checked: boolean, onToggle: () => void }) {
  const isPackEssential = item.phase === "pack" && item.subcategory === "essentiels" && item.isCritical;

  return (
    <div
      className="flex items-start gap-3 p-2.5 rounded-md hover-elevate cursor-pointer transition-colors"
      data-testid={`client-checklist-${item.id}`}
      onClick={onToggle}
    >
      <div className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${checked ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm transition-all ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.text}</span>
          {isPackEssential && <span className="text-[10px] font-bold px-1.5 py-0 rounded-sm bg-destructive/15 text-destructive shrink-0">Essentiel</span>}
          {!isPackEssential && item.isCritical && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">!</Badge>}
        </div>
        {item.hint && <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>}
      </div>
      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="shrink-0 mt-0.5 text-primary/70 hover:text-primary transition-colors"
          data-testid={`link-checklist-${item.id}`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

function PhaseAccordion({ phase, items, isChecked, toggle }: { phase: "before" | "week" | "pack", items: any[], isChecked: (id: number) => boolean, toggle: (id: number) => void }) {
  const config = PHASE_CONFIG[phase];
  const Icon = config.icon;
  const phaseChecked = items.filter(i => isChecked(i.id)).length;
  const allDone = phaseChecked === items.length && items.length > 0;
  const [open, setOpen] = useState(!allDone);

  useEffect(() => {
    if (allDone) setOpen(false);
  }, [allDone]);

  const groups = new Map<string, any[]>();
  items.forEach(item => {
    const key = (phase === "pack" ? item.subcategory : item.category) || "Autre";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  });

  const subcategoryOrder = ["essentiels", "vetements", "toilette", "tech", "confort"];
  const sortedGroups = phase === "pack"
    ? Array.from(groups.entries()).sort((a, b) => {
        const ia = subcategoryOrder.indexOf(a[0]);
        const ib = subcategoryOrder.indexOf(b[0]);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
    : Array.from(groups.entries());

  return (
    <Card className="overflow-visible" data-testid={`phase-${phase}`}>
      <div
        className={`flex items-center gap-3 p-3.5 cursor-pointer select-none ${allDone ? config.bgClass : ""}`}
        onClick={() => setOpen(o => !o)}
        data-testid={`phase-header-${phase}`}
      >
        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${config.bgClass}`}>
          <Icon className={`w-4 h-4 ${config.colorClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold">{config.title}</span>
            {allDone && <span className="text-xs text-emerald-500 font-medium">Terminé !</span>}
          </div>
        </div>
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${config.badgeClass}`}>{phaseChecked}/{items.length}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`} />
      </div>

      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
        }}
      >
        <div className="min-h-0">
          <div className="px-3.5 pb-3.5 space-y-3">
            {sortedGroups.map(([group, groupItems]) => (
              <div key={group}>
                {sortedGroups.length > 1 && (
                  <h5 className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider mb-1 pl-1">
                    {phase === "pack" ? (SUBCATEGORY_LABELS[group] || group) : group}
                  </h5>
                )}
                <div className="space-y-0.5">
                  {groupItems.map((item: any) => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      checked={isChecked(item.id)}
                      onToggle={() => toggle(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ClientChecklist({ items, token }: { items: any[], token: string }) {
  const { isChecked, toggle } = useLocalChecklist(token);

  const totalItems = items.length;
  const checkedCount = items.filter(item => isChecked(item.id)).length;
  const progressPercent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const phaseItems = {
    before: items.filter(i => i.phase === "before"),
    week: items.filter(i => i.phase === "week"),
    pack: items.filter(i => !i.phase || i.phase === "pack"),
  };

  return (
    <div className="pb-24 space-y-3">
      {progressPercent === 100 && totalItems > 0 && (
        <Card className="p-4 bg-emerald-500/10 border-emerald-500/20" data-testid="checklist-complete-card">
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 text-center">
            Tout est prêt pour le départ !
          </p>
        </Card>
      )}

      {totalItems > 0 && (
        <Card className="p-4" data-testid="client-checklist-progress">
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-sm font-medium text-muted-foreground" data-testid="client-checklist-progress-count">{checkedCount}/{totalItems}</span>
            <span className={`text-lg font-bold ${progressPercent === 100 ? "text-green-500" : "text-primary"}`} data-testid="client-checklist-progress-percent">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
        </Card>
      )}

      {(["before", "week", "pack"] as const).map(phase => {
        const pItems = phaseItems[phase];
        if (pItems.length === 0) return null;
        return (
          <PhaseAccordion
            key={phase}
            phase={phase}
            items={pItems}
            isChecked={isChecked}
            toggle={toggle}
          />
        );
      })}
    </div>
  );
}

function CurrencyConverter({ tripCurrency, localCurrency, localSymbol, rate }: { tripCurrency: string, localCurrency: string, localSymbol: string, rate: number }) {
  const [amount, setAmount] = useState("100");
  const [direction, setDirection] = useState<"toLocal" | "fromLocal">("toLocal");

  const numAmount = parseFloat(amount) || 0;
  const converted = direction === "toLocal"
    ? (numAmount * rate).toFixed(2)
    : (numAmount / rate).toFixed(2);

  const fromLabel = direction === "toLocal" ? tripCurrency : localSymbol;
  const toLabel = direction === "toLocal" ? localSymbol : tripCurrency;

  return (
    <div className="space-y-3" data-testid="converter-currency">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="text-center font-mono text-lg"
            data-testid="input-converter-amount"
          />
          <p className="text-[10px] text-muted-foreground text-center mt-1">{fromLabel}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDirection(d => d === "toLocal" ? "fromLocal" : "toLocal")}
          data-testid="button-converter-swap"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="h-9 flex items-center justify-center rounded-md bg-primary/10 font-mono text-lg font-bold text-primary" data-testid="text-converter-result">
            {converted}
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1">{toLabel}</p>
        </div>
      </div>
      <p className="text-[10px] text-center text-muted-foreground">
        1 {tripCurrency} = {rate} {localSymbol} (taux indicatif)
      </p>
    </div>
  );
}

function InfoCard({ icon: Icon, title, children, testId }: { icon: any, title: string, children: any, testId: string }) {
  return (
    <Card className="p-4" data-testid={testId}>
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary shrink-0" />
        {title}
      </h3>
      {children}
    </Card>
  );
}

function DocumentsSection({ documents }: { documents: any[] }) {
  const grouped: Record<string, any[]> = {};
  documents.forEach((doc: any) => {
    const type = doc.type || "other";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(doc);
  });

  const typeOrder = ["flight", "hotel", "transport", "insurance", "identity", "activity", "other"];
  const sortedTypes = typeOrder.filter(t => grouped[t]);

  return (
    <InfoCard icon={FileText} title="Documents de voyage" testId="card-info-documents">
      <div className="space-y-3">
        {sortedTypes.map(type => (
          <div key={type}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              {documentTypeLabel(type)}
            </p>
            <div className="space-y-1.5">
              {grouped[type].map((doc: any) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-md bg-muted/40 hover-elevate"
                  data-testid={`link-doc-info-${doc.id}`}
                >
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    {documentTypeIcon(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    {doc.note && <p className="text-[10px] text-muted-foreground truncate">{doc.note}</p>}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </InfoCard>
  );
}

function ClientInfosPratiques({ trip }: { trip: any }) {
  const info = trip.travelInfo;
  const docs = trip.documents || [];
  const hasInfo = info && !Object.values(info).every((v: any) => !v);

  if (!hasInfo && docs.length === 0) {
    return (
      <div className="pb-24 flex flex-col items-center justify-center py-12 gap-3 text-center">
        <Info className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Aucune info pratique disponible pour ce voyage</p>
      </div>
    );
  }

  if (!hasInfo && docs.length > 0) {
    return (
      <div className="pb-24 space-y-3">
        <DocumentsSection documents={docs} />
      </div>
    );
  }

  const hasEmergency = info.emergencyLocal || info.emergencyPolice || info.emergencyAmbulance || info.emergencyFire;
  const hasEmbassy = info.embassy || info.embassyPhone;
  const hasTimezone = info.timezone || info.timezoneOffset;
  const hasCurrency = info.localCurrency || info.exchangeRate;
  const hasPlug = info.voltage || info.plugType;
  const hasSim = info.simWifi;
  const hasNotes = info.customNotes;

  const emergencyItems = [
    { label: "Urgences", value: info.emergencyLocal },
    { label: "Police", value: info.emergencyPolice },
    { label: "Ambulance", value: info.emergencyAmbulance },
    { label: "Pompiers", value: info.emergencyFire },
  ].filter(e => e.value);

  return (
    <div className="pb-24 space-y-3">
      {docs.length > 0 && <DocumentsSection documents={docs} />}

      {hasEmergency && (
        <InfoCard icon={Shield} title="Numéros d'urgence" testId="card-info-emergency">
          <div className="grid grid-cols-2 gap-2">
            {emergencyItems.map(item => (
              <a
                key={item.label}
                href={`tel:${item.value}`}
                className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 hover-elevate"
                data-testid={`link-emergency-${item.label.toLowerCase()}`}
              >
                <Phone className="w-4 h-4 text-destructive shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-bold font-mono">{item.value}</p>
                </div>
              </a>
            ))}
          </div>
        </InfoCard>
      )}

      {hasEmbassy && (
        <InfoCard icon={Globe} title="Ambassade / Consulat" testId="card-info-embassy">
          {info.embassy && <p className="text-sm text-foreground">{info.embassy}</p>}
          {info.embassyPhone && (
            <a href={`tel:${info.embassyPhone}`} className="flex items-center gap-2 mt-2 text-sm text-primary font-medium" data-testid="link-embassy-phone">
              <Phone className="w-3.5 h-3.5" />
              {info.embassyPhone}
            </a>
          )}
        </InfoCard>
      )}

      {hasTimezone && (
        <InfoCard icon={Clock} title="Fuseau horaire" testId="card-info-timezone">
          {info.timezone && <p className="text-sm font-medium text-foreground" data-testid="text-timezone">{info.timezone}</p>}
          {info.timezoneOffset && <p className="text-xs text-muted-foreground mt-1" data-testid="text-timezone-offset">{info.timezoneOffset}</p>}
        </InfoCard>
      )}

      {hasCurrency && (
        <InfoCard icon={Banknote} title="Devise locale" testId="card-info-currency">
          {info.localCurrency && (
            <p className="text-sm text-foreground mb-2">
              <span className="font-bold">{info.localCurrency}</span>
              {info.localCurrencySymbol && <span className="text-muted-foreground"> ({info.localCurrencySymbol})</span>}
            </p>
          )}
          {info.exchangeRate && (
            <CurrencyConverter
              tripCurrency={trip.currency || "\u20ac"}
              localCurrency={info.localCurrency || "Local"}
              localSymbol={info.localCurrencySymbol || "?"}
              rate={info.exchangeRate}
            />
          )}
        </InfoCard>
      )}

      {info.tippingCulture && (
        <InfoCard icon={Banknote} title="Culture du pourboire" testId="card-info-tipping">
          <p className="text-sm text-foreground whitespace-pre-line">{info.tippingCulture}</p>
        </InfoCard>
      )}

      {hasPlug && (
        <InfoCard icon={Plug} title="Prises électriques" testId="card-info-plug">
          {info.voltage && (
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
              <p className="text-sm text-foreground">{info.voltage}</p>
            </div>
          )}
          {info.plugType && (
            <div className="flex items-center gap-2">
              <Plug className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <p className="text-sm text-foreground">{info.plugType}</p>
            </div>
          )}
        </InfoCard>
      )}

      {hasSim && (
        <InfoCard icon={Wifi} title="SIM & WiFi" testId="card-info-sim">
          <p className="text-sm text-foreground whitespace-pre-line">{info.simWifi}</p>
        </InfoCard>
      )}

      {hasNotes && (
        <InfoCard icon={Lightbulb} title="Bon à savoir" testId="card-info-notes">
          <p className="text-sm text-foreground whitespace-pre-line">{info.customNotes}</p>
        </InfoCard>
      )}
    </div>
  );
}

export default function ClientView() {
  const [match, params] = useRoute("/share/:token");
  const token = params?.token || "";
  const { data: trip, isLoading } = useTripByToken(token);
  const [tab, setTab] = useState("accueil");
  const { theme, toggleTheme } = useTheme();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <MapPin className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Voyage introuvable</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-shell">
        <div className="sticky top-0 z-40 glass border-b border-border/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {trip.coverImageUrl ? (
                  <img src={trip.coverImageUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <span className="text-lg">{trip.coverEmoji}</span>
                )}
                <h1 className="text-lg font-display font-bold" data-testid="text-client-trip-title">{trip.title}</h1>
              </div>
              {trip.destination && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {trip.destination}
                  {trip.subtitle && <span> &middot; {trip.subtitle}</span>}
                </p>
              )}
              {trip.welcomeText && (
                <p className="text-xs text-primary/80 mt-1" data-testid="text-header-greeting">{trip.welcomeText}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {trip.guideUrl && (
                <a href={trip.guideUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" data-testid="button-client-download-guide">
                    <Download className="w-4 h-4" />
                  </Button>
                </a>
              )}
              <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-client-theme">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="px-4 py-4">
          {tab === "accueil" && <ClientAccueil trip={trip} />}
          {tab === "carte" && <ClientCarte days={trip.days || []} googleMyMapsUrl={trip.googleMyMapsUrl} />}
          {tab === "jours" && <ClientJours days={trip.days || []} />}
          {tab === "budget" && <ClientBudget trip={trip} token={token} />}
          {tab === "check" && <ClientChecklist items={trip.checklistItems || []} token={token} />}
          {tab === "infos" && <ClientInfosPratiques trip={trip} />}
        </div>
      </div>

      <a
        href="https://wa.me/33668467347"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
        data-testid="link-whatsapp-client"
        aria-label="Contacter sur WhatsApp"
      >
        <SiWhatsapp className="w-6 h-6 text-white" />
      </a>

      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}
