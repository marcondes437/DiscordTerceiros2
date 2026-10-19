import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { games } from "@/data/games";
import { useCommunityProfiles } from "./use-community-profiles";

export function useGamingAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  const { profiles, refresh: refreshProfile } = useCommunityProfiles(user?.id);
  const profile = profiles[user?.id ?? ""];
  const stored = user?.user_metadata?.["favorite_games"];
  const favorites: string[] = Array.isArray(stored)
    ? stored.filter((id) => typeof id === "string" && games.some((g) => g.id === id))
    : [];
  async function toggleFavorite(id: string) {
    if (!user || busy || !games.some((g) => g.id === id)) return;
    setBusy(true);
    setError("");
    const next = favorites.includes(id)
      ? favorites.filter((item) => item !== id)
      : [...favorites, id];
    try {
      const result = await supabase.auth.updateUser({ data: { favorite_games: next } });
      if (result.error) setError("Não foi possível atualizar seus favoritos. Tente novamente.");
      else if (result.data.user) setUser(result.data.user);
    } catch {
      setError("Falha na conexão. Seus favoritos foram mantidos.");
    } finally {
      setBusy(false);
    }
  }
  const name =
    profile?.display_name ||
    String(
      user?.user_metadata?.["display_name"] || user?.user_metadata?.["full_name"] || "Visitante",
    );
  return { user, profile, name, favorites, toggleFavorite, busy, error, refreshProfile };
}
