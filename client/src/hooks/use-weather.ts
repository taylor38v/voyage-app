import { useQuery } from "@tanstack/react-query";

interface WeatherData {
  main: {
    temp: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  name: string;
}

// NOTE: In a real production app, you would proxy this through your backend 
// to hide the API key, or use a restricted public key.
// Using a demo-like approach here for the UI prototype.
const API_KEY = "bd5e378503939ddaee76f12ad7a97608"; // Public OpenWeatherMap test key

export function useWeather(city: string) {
  return useQuery({
    queryKey: ["weather", city],
    queryFn: async () => {
      if (!city) return null;
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`
        );
        if (!res.ok) {
          // Fail gracefully if key is invalid or city not found
          console.warn(`Weather fetch failed for ${city}: ${res.statusText}`);
          return null;
        }
        const data = await res.json();
        return data as WeatherData;
      } catch (err) {
        console.error("Weather error:", err);
        return null;
      }
    },
    enabled: !!city,
    staleTime: 1000 * 60 * 30, // 30 mins
  });
}
