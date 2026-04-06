import { Layout } from "@/components/layout";
import { useTrips } from "@/hooks/use-trips";
import { Loader2, MapPin, Users, Calendar, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

function TripCard({ trip }: { trip: any }) {
  return (
    <Link href={`/trip/${trip.id}`}>
      <div className="group relative bg-card rounded-md overflow-hidden border border-border/50 shadow-sm hover-elevate active-elevate-2 cursor-pointer" data-testid={`card-trip-${trip.id}`}>
        <div className="h-1.5 w-full bg-gradient-to-r from-primary to-orange-400" />

        <div className="p-5">
          <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
            <span className="text-3xl">{trip.coverEmoji}</span>
            <Badge variant="secondary" className="text-xs">{trip.subtitle || "Voyage"}</Badge>
          </div>

          <h3 className="text-lg font-bold font-display text-foreground mb-1 group-hover:text-primary transition-colors" data-testid={`text-trip-title-${trip.id}`}>
            {trip.title}
          </h3>

          {trip.destination && (
            <div className="flex items-center text-muted-foreground text-sm mb-4 gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {trip.destination}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border/50 flex-wrap gap-2">
            <div className="flex items-center text-xs text-muted-foreground font-medium gap-1">
              <Users className="w-3 h-3" />
              {trip.travelers} voyageur{trip.travelers > 1 ? "s" : ""}
            </div>
            {trip.totalBudget > 0 && (
              <span className="text-xs font-medium text-muted-foreground">{trip.currency}{trip.totalBudget}</span>
            )}
          </div>

          <div className="flex items-center justify-end mt-3 text-xs text-primary font-medium gap-1">
            Consulter <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: trips, isLoading } = useTrips();

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
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-page-title">Mes voyages</h1>
          <p className="text-muted-foreground mt-1" style={{ fontFamily: "var(--font-sans)" }}>Retrouvez ici vos voyages achetés</p>
        </div>

        {trips && trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-card rounded-md border border-border/50">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5 text-primary">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold font-display mb-2">Aucun voyage disponible</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto" style={{ fontFamily: "var(--font-sans)" }}>
              Vos voyages achetés apparaîtront ici. Contactez-nous si vous avez effectué un achat et que votre voyage ne s'affiche pas.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
