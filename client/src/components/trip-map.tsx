import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  dayNumber: number;
  time: string;
  color: string;
  type: string;
  googleMapsUrl?: string;
}

function getMarkers(days: any[]): MapMarker[] {
  const markers: MapMarker[] = [];
  days.forEach((day) => {
    (day.activities || []).forEach((a: any) => {
      if (a.latitude && a.longitude) {
        markers.push({
          lat: a.latitude,
          lng: a.longitude,
          title: a.title,
          dayNumber: day.dayNumber,
          time: a.time,
          color: day.color || "#FF6B6B",
          type: a.type || "activity",
          googleMapsUrl: a.googleMapsUrl || undefined,
        });
      }
    });
  });
  return markers;
}

function createIcon(color: string, label: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background:${color};color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

export function TripMap({ days, className }: { days: any[], className?: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    const markers = getMarkers(days);
    if (markers.length === 0 || !mapRef.current) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const bounds = L.latLngBounds([]);

    markers.forEach((m) => {
      const icon = createIcon(m.color, String(m.dayNumber));
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
      const mapsLink = m.googleMapsUrl
        ? m.googleMapsUrl
        : `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`;
      marker.bindPopup(
        `<div style="font-family:sans-serif;min-width:140px;">
          <strong style="font-size:13px;">${m.title}</strong><br/>
          <span style="font-size:11px;color:#666;">J${m.dayNumber} \u2013 ${m.time}</span><br/>
          <a href="${mapsLink}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;padding:4px 10px;background:#4285F4;color:white;border-radius:4px;font-size:11px;font-weight:600;text-decoration:none;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Google Maps
          </a>
        </div>`
      );
      bounds.extend([m.lat, m.lng]);
    });

    const dayGroups = new Map<number, L.LatLng[]>();
    markers.forEach((m) => {
      if (!dayGroups.has(m.dayNumber)) dayGroups.set(m.dayNumber, []);
      dayGroups.get(m.dayNumber)!.push(L.latLng(m.lat, m.lng));
    });

    dayGroups.forEach((points, dayNum) => {
      if (points.length > 1) {
        const color = markers.find((m) => m.dayNumber === dayNum)?.color || "#FF6B6B";
        L.polyline(points, { color, weight: 2, opacity: 0.5, dashArray: "6 4" }).addTo(map);
      }
    });

    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });

    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [days]);

  const markers = getMarkers(days);
  if (markers.length === 0) return null;

  return (
    <div className={className}>
      <div ref={mapRef} className="w-full h-[300px] md:h-[400px] rounded-md overflow-hidden border border-border/50" data-testid="trip-map" />
    </div>
  );
}
