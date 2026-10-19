import { useCallback, useEffect, useRef, useState } from "react";
import { gameAction, type RoomSnapshot } from "@/lib/gaming";

export function useGameRoom(userId: string | undefined, roomId: string) {
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [ready, setReady] = useState(false);
  const current = useRef<RoomSnapshot | null>(null);
  const generation = useRef(0);
  const accept = useCallback((snapshot: RoomSnapshot) => {
    if (snapshot.version >= (current.current?.version ?? 0)) {
      current.current = snapshot;
      setRoom(snapshot);
    }
  }, []);
  useEffect(() => {
    const gen = ++generation.current;
    current.current = null;
    setRoom(null);
    setReady(false);
    setError("");
    setConnectionError("");
    if (!userId || !roomId) return;
    let polling = false;
    let joined = false;
    const poll = async () => {
      if (polling || !joined || document.hidden) return;
      polling = true;
      try {
        const host = current.current?.host === userId;
        const snapshot = await gameAction(
          roomId,
          host && current.current?.game === "slithersenai" ? "tick" : "view",
        );
        if (gen === generation.current) {
          accept(snapshot);
          setConnectionError("");
        }
      } catch (e) {
        if (gen === generation.current)
          setConnectionError(e instanceof Error ? e.message : "Conexão interrompida.");
      } finally {
        polling = false;
      }
    };
    void gameAction(roomId, "join")
      .then((snapshot) => {
        if (gen !== generation.current) return;
        joined = true;
        accept(snapshot);
        setReady(true);
      })
      .catch((e) => {
        if (gen === generation.current) setError(e.message);
      });
    const timer = window.setInterval(poll, 220);
    // Keep membership while another tab is active; polling pauses and resumes safely.
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    const onPageHide = () => {
      void gameAction(roomId, "leave").catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      generation.current++;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onPageHide);
      void gameAction(roomId, "leave").catch(() => {});
    };
  }, [userId, roomId, accept]);
  const act = useCallback(
    async (action: string, data: Record<string, unknown> = {}) => {
      const gen = generation.current;
      setError("");
      try {
        const snapshot = await gameAction(roomId, action, data);
        if (gen === generation.current && snapshot.id) accept(snapshot);
        return snapshot;
      } catch (e) {
        if (gen === generation.current)
          setError(e instanceof Error ? e.message : "Ação indisponível.");
        return null;
      }
    },
    [roomId, accept],
  );
  return { room, error: error || connectionError, ready, act };
}
