import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { friendshipWith, type Friendship, type FriendAction } from "@/lib/friendships";
const db = supabase as any;
export function useFriendships(userId?: string) {
  const [rows, setRows] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const sequence = useRef(0);
  const current = useRef(userId);
  current.current = userId;
  const refresh = useCallback(async () => {
    if (!userId) return;
    const run = ++sequence.current;
    try {
      const result = await db
        .from("community_friendships")
        .select("id,requester_id,recipient_id,status,created_at")
        .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
      if (current.current !== userId || run !== sequence.current) return;
      if (result.error) throw result.error;
      setRows(result.data ?? []);
      setError("");
    } catch {
      if (current.current !== userId || run !== sequence.current) return;
      setRows([]);
      setError("Não foi possível verificar suas amizades. Tente novamente.");
    } finally {
      if (current.current === userId && run === sequence.current) setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    setRows([]);
    setLoading(!!userId);
    setError("");
    if (!userId) return;
    const update = () => {
      if (!document.hidden) void refresh();
    };
    void refresh();
    const timer = window.setInterval(update, 5000);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, [refresh, userId]);
  const act = async (other: string, action: FriendAction) => {
    if (!userId || other === userId || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const row = friendshipWith(rows, userId, other);
      let result;
      if (action === "request")
        result = await db
          .from("community_friendships")
          .insert({ requester_id: userId, recipient_id: other });
      else if (!row) throw new Error("Solicitação não encontrada. Atualize suas amizades.");
      else if (action === "accept")
        result = await db
          .from("community_friendships")
          .update({ status: "accepted" })
          .eq("id", row.id)
          .select("id");
      else result = await db.from("community_friendships").delete().eq("id", row.id).select("id");
      if (result.error)
        throw new Error(
          result.error.code === "23505"
            ? "Já existe uma solicitação entre vocês. Atualize a lista."
            : "Não foi possível atualizar a amizade. Tente novamente.",
        );
      if (action !== "request" && !result.data?.length)
        throw new Error("A solicitação já mudou. Atualize a lista.");
      await refresh();
    } catch (e) {
      if (current.current === userId)
        setError(e instanceof Error ? e.message : "Falha ao atualizar a amizade.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return { rows, loading, error, busy, act, refresh };
}
