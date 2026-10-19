import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MessageKind = "channel" | "direct";
export type MessageMark = {
  id: string;
  user_id: string;
  channel_message_id: string | null;
  direct_message_id: string | null;
  kind: "reaction" | "pin" | "favorite";
  value: string;
};
const db = supabase as any;
export function useMessageMarks(kind: MessageKind, userId: string | undefined, ids: string[]) {
  const [rows, setRows] = useState<MessageMark[]>([]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const scope = `${kind}:${userId}:${ids.join(",")}`;
  const current = useRef(scope);
  const sequence = useRef(0);
  current.current = scope;
  const column = kind === "channel" ? "channel_message_id" : "direct_message_id";
  const refresh = useCallback(async () => {
    if (!userId || !ids.length) return;
    const run = ++sequence.current;
    try {
      const batches = [];
      for (let start = 0; start < ids.length; start += 100) {
        batches.push(db.from("chat_message_marks").select("*").in(column, ids.slice(start, start + 100)));
      }
      const results = await Promise.all(batches);
      if (current.current === scope && run === sequence.current && results.every(result => !result.error)) {
        setRows(results.flatMap(result => result.data ?? []));
      }
    } catch {
      /* A failed refresh must not clear the conversation. Mutations show errors. */
    }
  }, [scope]);
  useEffect(() => {
    setRows([]);
    if (!userId || !ids.length) return;
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
  }, [refresh]);
  const toggle = async (messageId: string, mark: MessageMark["kind"], value = "") => {
    if (!userId || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const existing = rows.find(
        (r) =>
          r[column] === messageId && r.user_id === userId && r.kind === mark && r.value === value,
      );
      const result = existing
        ? await db
            .from("chat_message_marks")
            .delete()
            .eq("id", existing.id)
            .eq("user_id", userId)
            .select("id")
        : await db
            .from("chat_message_marks")
            .insert({ user_id: userId, [column]: messageId, kind: mark, value })
            .select("*");
      if (result.error || !result.data?.length) throw Error();
      if (current.current !== scope) return;
      setRows((previous) =>
        existing ? previous.filter((r) => r.id !== existing.id) : [...previous, ...result.data],
      );
      await refresh();
    } catch {
      toast.error("Não foi possível atualizar a mensagem. Tente novamente.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return { rows, busy, toggle };
}
