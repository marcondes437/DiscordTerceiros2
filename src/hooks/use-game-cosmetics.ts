import { useCallback, useEffect, useState } from "react";
import { badges, gamingDb } from "@/lib/gaming";
export function useGameCosmetics(userId: string | undefined) {
  const [selection, setSelection] = useState({ frame: "none", title: "none" });
  const [earned, setEarned] = useState<string[]>([]);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let live = true;
    if (!userId) {
      setSelection({ frame: "none", title: "none" });
      setEarned([]);
      return;
    }
    void Promise.all([
      gamingDb.from("gaming_cosmetics").select("frame,title").eq("user_id", userId).maybeSingle(),
      gamingDb.from("gaming_badges").select("badge").eq("user_id", userId),
    ]).then(([c, b]) => {
      if (!live) return;
      if (!c.error && c.data) setSelection(c.data);
      if (!b.error) setEarned((b.data ?? []).map((r: { badge: string }) => r.badge));
    });
    return () => {
      live = false;
    };
  }, [userId, version]);
  const frame = badges.find((b) => b.id === selection.frame && earned.includes(b.id));
  const title = badges.find((b) => b.id === selection.title && earned.includes(b.id));
  return { frame, title, refresh };
}
