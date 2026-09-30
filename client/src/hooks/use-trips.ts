import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { 
  Trip, TripWithDetails
} from "@shared/schema";

export function useTrips() {
  return useQuery<Trip[]>({
    queryKey: [api.trips.list.path],
    queryFn: async () => {
      const res = await fetch(api.trips.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Impossible de charger les voyages");
      return res.json();
    },
  });
}

export function useTrip(id: number) {
  return useQuery<TripWithDetails | null>({
    queryKey: [api.trips.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.trips.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Impossible de charger le voyage");
      return res.json();
    },
    enabled: !!id,
  });
}

// Copie locale du voyage partagé : le carnet reste lisible sans réseau (avion, étranger sans data).
const cleCopie = (token: string) => `voyageo:voyage:${token}`;

export function lireCopieVoyage(token: string): (TripWithDetails & { _horsLigne?: boolean; _copieDu?: string }) | null {
  try {
    const brut = localStorage.getItem(cleCopie(token));
    if (!brut) return null;
    const { enregistreLe, voyage } = JSON.parse(brut);
    return { ...voyage, _horsLigne: true, _copieDu: enregistreLe };
  } catch {
    return null;
  }
}

export function useTripByToken(token: string) {
  return useQuery<(TripWithDetails & { _horsLigne?: boolean; _copieDu?: string }) | null>({
    queryKey: [api.trips.getByToken.path, token],
    queryFn: async () => {
      const url = buildUrl(api.trips.getByToken.path, { token });
      let res: Response;
      try {
        res = await fetch(url);
      } catch {
        const copie = lireCopieVoyage(token);
        if (copie) return copie;
        throw new Error("Pas de réseau et aucune copie de ce voyage sur cet appareil");
      }
      if (res.status === 404) return null;
      if (!res.ok) {
        const copie = lireCopieVoyage(token);
        if (copie) return copie;
        throw new Error("Impossible de charger le voyage");
      }
      const voyage = await res.json();
      try {
        localStorage.setItem(cleCopie(token), JSON.stringify({ enregistreLe: new Date().toISOString(), voyage }));
      } catch {}
      return voyage;
    },
    enabled: !!token,
    retry: (n) => navigator.onLine && n < 2,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, data }: { tripId: number; data: { dayNumber: number; category: string; amount: string; note: string } }) => {
      const url = buildUrl(api.expenses.create.path, { tripId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Impossible d'ajouter la d\u00e9pense");
      return res.json();
    },
    onSuccess: (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: [api.trips.get.path, tripId] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ expenseId, tripId }: { expenseId: number; tripId: number }) => {
      const url = buildUrl(api.expenses.delete.path, { id: expenseId });
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Impossible de supprimer la d\u00e9pense");
    },
    onSuccess: (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: [api.trips.get.path, tripId] });
    },
  });
}

export function useCheckItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, tripId, checked }: { itemId: number, tripId: number, checked: boolean }) => {
      const url = buildUrl(api.checklist.check.path, { itemId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Impossible de mettre \u00e0 jour");
      return res.json();
    },
    onSuccess: (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: [api.trips.get.path, tripId] });
    },
  });
}
