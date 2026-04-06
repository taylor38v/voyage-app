import { useQuery } from "@tanstack/react-query";
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets, CloudDrizzle, CloudFog, Cloudy } from "lucide-react";

interface WeatherData {
  temperature: number;
  temperatureMax: number | null;
  temperatureMin: number | null;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  city: string;
  precipitation: number;
}

function getWeatherIcon(pictocode: string) {
  const code = parseInt(pictocode, 10);
  if (code === 1) return <Sun className="w-8 h-8 text-yellow-400" />;
  if (code === 2 || code === 3) return <Cloudy className="w-8 h-8 text-gray-400" />;
  if (code === 4) return <Cloud className="w-8 h-8 text-gray-500" />;
  if (code === 5) return <CloudFog className="w-8 h-8 text-gray-400" />;
  if (code === 6) return <CloudDrizzle className="w-8 h-8 text-blue-300" />;
  if (code >= 7 && code <= 10) return <CloudRain className="w-8 h-8 text-blue-400" />;
  if (code >= 11 && code <= 13) return <CloudSnow className="w-8 h-8 text-blue-200" />;
  if (code === 14 || code === 15) return <CloudRain className="w-8 h-8 text-blue-400" />;
  if (code === 16) return <CloudLightning className="w-8 h-8 text-yellow-500" />;
  if (code === 17) return <CloudLightning className="w-8 h-8 text-red-400" />;
  return <Cloud className="w-8 h-8 text-gray-400" />;
}

export function WeatherWidget({ destination, className }: { destination: string, className?: string }) {
  const { data, isLoading, error } = useQuery<WeatherData | null>({
    queryKey: ["/api/weather", destination],
    queryFn: async () => {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(destination)}`);
      if (res.status === 501 || res.status === 503 || res.status === 404) return null;
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!destination,
    staleTime: 1000 * 60 * 30,
    retry: false,
  });

  if (isLoading || error || !data) return null;

  return (
    <div className={`bg-card rounded-md border border-border/50 p-4 shadow-sm ${className || ""}`} data-testid="weather-widget">
      <div className="flex items-center gap-4">
        {getWeatherIcon(data.icon)}
        <div className="flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-bold">{data.temperature}{"\u00b0"}C</span>
            {data.temperatureMax !== null && data.temperatureMin !== null && (
              <span className="text-xs text-muted-foreground">{data.temperatureMin}{"\u00b0"} / {data.temperatureMax}{"\u00b0"}</span>
            )}
            <span className="text-sm text-muted-foreground capitalize">{data.description}</span>
          </div>
          <p className="text-xs text-muted-foreground">{data.city}</p>
        </div>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> {data.humidity}%</span>
          <span className="flex items-center gap-1"><Wind className="w-3 h-3" /> {data.windSpeed} km/h</span>
        </div>
      </div>
    </div>
  );
}
