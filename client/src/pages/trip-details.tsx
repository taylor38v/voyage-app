import { Layout } from "@/components/layout";
import { useTrip, useCheckItem, useCreateExpense, useDeleteExpense } from "@/hooks/use-trips";
import { useRoute } from "wouter";
import { Loader2, Calendar, MapPin, CheckSquare, BarChart3, Share2, Clock, Lightbulb, Flame, FileText, Download, Map as MapIcon, Hotel, Camera, Navigation, ChevronDown, ChevronLeft, ChevronRight, Zap, Sparkles, ExternalLink, Wallet, Plane, UtensilsCrossed, ShoppingBag, PartyPopper, Sun, Bus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { TripMap } from "@/components/trip-map";
import { WeatherWidget } from "@/components/weather-widget";
import BudgetSection from "@/components/budget-section";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

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

function getCityIcon(city: string) {
  const lower = city.toLowerCase();
  if (lower.includes("bangkok")) return Hotel;
  if (lower.includes("ayutthaya")) return Camera;
  if (lower.includes("chiang")) return MapPin;
  if (lower.includes("koh") || lower.includes("phangan") || lower.includes("tao")) return Navigation;
  if (lower.includes("krabi") || lower.includes("phuket")) return Navigation;
  return MapPin;
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

function JoursTab({ days }: { days: any[] }) {
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
  if (!currentDay) return <p className="text-center text-muted-foreground py-8">Aucun jour disponible.</p>;

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
    <div className="space-y-3">
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
              <span className={`text-[10px] font-bold ${isActive ? "text-white" : "text-muted-foreground"}`}>J{day.dayNumber}</span>
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
        <div className="absolute left-[11px] top-3 bottom-3 w-[2px] rounded-full opacity-25" style={{ backgroundColor: dayColor }} />

        <div className="space-y-2">
          {currentDay.activities?.map((a: any) => {
            const TypeIcon = a.isPersonal ? Flame : getActivityIcon(a.type || "activity");
            const iconBg = a.isPersonal ? "bg-orange-500/15 text-orange-500" : getActivityIconBg(a.type || "activity");
            const isExpanded = expandedActivity === a.id;
            const cost = parseFloat(a.cost || "0");

            return (
              <div
                key={a.id}
                className="relative flex items-start gap-0"
                data-testid={`activity-${a.id}`}
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

function BudgetOverview({ trip }: { trip: any }) {
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const handleAdd = (data: { dayNumber: number; category: string; amount: string; note: string; paidBy?: string; splitWith?: string[] }) => {
    createExpense.mutate({ tripId: trip.id, data });
  };

  const handleDelete = (id: number | string) => {
    deleteExpense.mutate({ expenseId: id as number, tripId: trip.id });
  };

  return (
    <BudgetSection
      trip={trip}
      expenses={trip.expenses || []}
      currency={trip.currency || "\u20ac"}
      onAddExpense={handleAdd}
      onDeleteExpense={handleDelete}
      isAdding={createExpense.isPending}
      dayCount={(trip.days || []).length}
      participants={trip.participants || []}
    />
  );
}

const TRIP_PHASE_CONFIG: Record<string, { title: string, color: string }> = {
  before: { title: "Bien avant le départ", color: "bg-blue-500" },
  week: { title: "La semaine avant", color: "bg-amber-500" },
  pack: { title: "Dans la valise", color: "bg-emerald-500" },
};

function ChecklistView({ trip }: { trip: any }) {
  const checkItem = useCheckItem();

  const allItems = trip.checklistItems || [];
  const isChecked = (item: any) => item.checks?.some((c: any) => c.checked);
  const totalItems = allItems.length;
  const checkedCount = allItems.filter(isChecked).length;
  const progressPercent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const phaseGroups = {
    before: allItems.filter((i: any) => i.phase === "before"),
    week: allItems.filter((i: any) => i.phase === "week"),
    pack: allItems.filter((i: any) => !i.phase || i.phase === "pack"),
  };

  const renderItem = (item: any) => {
    const checked = isChecked(item);
    return (
      <div
        key={item.id}
        className="flex items-start gap-3 p-2 rounded-md hover-elevate cursor-pointer transition-colors"
        data-testid={`checklist-item-${item.id}`}
        onClick={() => checkItem.mutate({ itemId: item.id, tripId: trip.id, checked: !checked })}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={checked}
            onCheckedChange={(val) => {
              if (val !== "indeterminate") {
                checkItem.mutate({ itemId: item.id, tripId: trip.id, checked: val as boolean });
              }
            }}
            className="w-4.5 h-4.5 border-2 mt-0.5"
            data-testid={`checkbox-${item.id}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-sm transition-all ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {item.text}
          </span>
          {item.hint && <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>}
        </div>
        {item.isCritical && <Badge variant="destructive" className="text-xs px-1.5 py-0 shrink-0">!</Badge>}
        {item.link && (
          <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="shrink-0 text-primary/70 hover:text-primary">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-md border border-border/50 p-5 shadow-sm max-w-lg mx-auto">
      <h3 className="text-lg font-bold font-display mb-4">Checklist départ</h3>

      {totalItems > 0 && (
        <div className="mb-5 p-4 rounded-md bg-muted/30 border border-border/30" data-testid="checklist-progress">
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-sm font-medium text-muted-foreground" data-testid="checklist-progress-count">{checkedCount}/{totalItems}</span>
            <span className={`text-lg font-bold ${progressPercent === 100 ? "text-green-500" : "text-primary"}`} data-testid="checklist-progress-percent">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2.5" />
        </div>
      )}

      {(["before", "week", "pack"] as const).map(phase => {
        const items = phaseGroups[phase];
        if (items.length === 0) return null;
        const config = TRIP_PHASE_CONFIG[phase];
        return (
          <div key={phase} className="mb-5 last:mb-0">
            <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${config.color}`} />
              {config.title}
            </h4>
            <div className="space-y-1.5">
              {items.map(renderItem)}
            </div>
          </div>
        );
      })}

      {totalItems === 0 && (
        <p className="text-center text-muted-foreground py-8 text-sm">Aucun élément dans la check-list.</p>
      )}
    </div>
  );
}

const DOC_TYPES = [
  { value: "flight", label: "Vol", icon: Plane },
  { value: "hotel", label: "Hébergement", icon: Hotel },
  { value: "transport", label: "Transport", icon: Bus },
  { value: "insurance", label: "Assurance", icon: Shield },
  { value: "identity", label: "Identité", icon: FileText },
  { value: "activity", label: "Activité", icon: Camera },
  { value: "other", label: "Autre", icon: FileText },
] as const;

function docTypeIcon(type: string) {
  const entry = DOC_TYPES.find(t => t.value === type);
  const Icon = entry?.icon || FileText;
  return <Icon className="w-4 h-4 text-primary" />;
}

function docTypeLabel(type: string) {
  return DOC_TYPES.find(t => t.value === type)?.label || "Document";
}

function DocumentsTab({ trip }: { trip: any }) {
  const documents = trip.documents || [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-display font-bold" data-testid="text-documents-title">
          Documents de voyage
        </h2>
        <p className="text-xs text-muted-foreground">
          {documents.length} document{documents.length !== 1 ? "s" : ""}
        </p>
      </div>

      {documents.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucun document pour ce voyage</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc: any) => (
            <a
              key={doc.id}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="p-3 flex items-center gap-3 hover-elevate" data-testid={`card-document-${doc.id}`}>
                <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  {docTypeIcon(doc.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">{docTypeLabel(doc.type)}</Badge>
                    {doc.note && <p className="text-[10px] text-muted-foreground truncate">{doc.note}</p>}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TripDetails() {
  const [match, params] = useRoute("/trip/:id");
  const tripId = Number(params?.id);
  const { data: trip, isLoading } = useTrip(tripId);
  const { toast } = useToast();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!trip) {
    return <Layout><div className="p-8 text-center text-muted-foreground">Voyage introuvable</div></Layout>;
  }

  const copyShareLink = () => {
    if (trip.shareToken) {
      navigator.clipboard.writeText(`${window.location.origin}/share/${trip.shareToken}`);
      toast({ title: "Lien copié !", description: "Le lien de partage est dans votre presse-papiers" });
    }
  };

  return (
    <Layout>
      <div className="border-b border-border/50 bg-card/50">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">{trip.coverEmoji}</span>
                <h1 className="text-2xl font-display font-bold text-foreground" data-testid="text-trip-title">
                  {trip.title}
                </h1>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                {trip.destination && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {trip.destination}</span>}
                {trip.subtitle && <span>{trip.subtitle}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {trip.guideUrl && (
                <a href={trip.guideUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" data-testid="button-download-guide">
                    <Download className="w-4 h-4 mr-1" /> Guide PDF
                  </Button>
                </a>
              )}
              <Button variant="outline" size="sm" onClick={copyShareLink} data-testid="button-share-trip">
                <Share2 className="w-4 h-4 mr-1" /> Partager
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="bg-card/80 backdrop-blur-sm p-1 rounded-md border border-border/50 w-full justify-start gap-1" data-testid="tabs-trip">
            <TabsTrigger value="timeline" className="rounded-md text-xs px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-timeline">
              <Calendar className="w-3.5 h-3.5 mr-1.5" /> Jours
            </TabsTrigger>
            <TabsTrigger value="carte" className="rounded-md text-xs px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-carte">
              <MapIcon className="w-3.5 h-3.5 mr-1.5" /> Carte
            </TabsTrigger>
            <TabsTrigger value="budget" className="rounded-md text-xs px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-budget">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Budget
            </TabsTrigger>
            <TabsTrigger value="checklist" className="rounded-md text-xs px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-checklist">
              <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> Check-list
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-md text-xs px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-documents">
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Docs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-6 animate-in">
            <JoursTab days={trip.days || []} />
          </TabsContent>

          <TabsContent value="carte" className="space-y-4 animate-in">
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <MapIcon className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-lg font-display font-bold text-foreground" data-testid="text-carte-title">Carte interactive</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Tous les points d'intérêt de votre voyage
              </p>
            </div>
            {trip.googleMyMapsUrl ? (
              <div className="bg-card rounded-md border border-border/50 overflow-hidden" data-testid="card-google-my-maps">
                <iframe
                  src={toGoogleMyMapsEmbed(trip.googleMyMapsUrl)}
                  className="w-full border-0"
                  style={{ height: "450px" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Google My Maps"
                  data-testid="iframe-google-my-maps"
                />
              </div>
            ) : (
              <>
                <div className="bg-card rounded-md border border-border/50 overflow-hidden">
                  <TripMap days={trip.days || []} className="[&_div[data-testid='trip-map']]:h-[400px] [&_div[data-testid='trip-map']]:rounded-none [&_div[data-testid='trip-map']]:border-0" />
                </div>
                {(trip.days || []).length > 0 && (
                  <div className="bg-card rounded-md border border-border/50 p-4">
                    <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-3">Légende par jour</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {(trip.days || []).map((day: any) => {
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
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="budget" className="animate-in">
            <BudgetOverview trip={trip} />
          </TabsContent>

          <TabsContent value="checklist" className="animate-in">
            <ChecklistView trip={trip} />
          </TabsContent>

          <TabsContent value="documents" className="animate-in">
            <DocumentsTab trip={trip} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
