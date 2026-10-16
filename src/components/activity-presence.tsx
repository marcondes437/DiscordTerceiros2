import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { memberClass, visibleRoom, type Space } from "@/lib/community-spaces";
import { games } from "@/data/games";
export type ActivityMember = {
  id: string;
  name: string;
  room: string | null;
  game?: string | null | undefined;
  gameUntil?: number | undefined;
};
export function mergeActivity(members: ActivityMember[], now = Date.now()) {
  const result = new Map<string, ActivityMember>();
  for (const m of members) {
    if (!m.id) continue;
    const old = result.get(m.id);
    const valid = games.some((g) => g.id === m.game) && (m.gameUntil ?? 0) > now;
    result.set(m.id, {
      ...m,
      room: m.room || old?.room || null,
      game: valid ? m.game : old?.game || null,
      gameUntil: valid ? m.gameUntil : old?.gameUntil,
    });
  }
  return [...result.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
type Activity = {
  user: User | null;
  online: ActivityMember[];
  classOnline: ActivityMember[];
  connected: boolean;
  setRoom: (room: string | null) => void;
  startGame: (id: string) => void;
  stopGame: () => void;
};
const Context = createContext<Activity>({
  user: null,
  online: [],
  classOnline: [],
  connected: false,
  setRoom: () => {},
  startGame: () => {},
  stopGame: () => {},
});
export const useActivityPresence = () => useContext(Context);
export function ActivityPresence({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [online, setOnline] = useState<ActivityMember[]>([]);
  const [classOnline, setClassOnline] = useState<ActivityMember[]>([]);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<string | null>(null);
  const [game, setGame] = useState<{ id: string; until: number } | null>(null);
  const channels = useRef<{ ch: RealtimeChannel; scope: Space; ready: boolean }[]>([]);
  const current = useRef({ room, game });
  current.current = { room, game };
  const name = String(
    user?.user_metadata?.["display_name"] ||
      user?.user_metadata?.["full_name"] ||
      user?.email?.split("@")[0] ||
      "Membro",
  );
  const turma = memberClass(user?.app_metadata);
  useEffect(() => {
    let live = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (live) setUser(data.user);
    });
    const { data } = supabase.auth.onAuthStateChange((_, session) =>
      setUser(session?.user ?? null),
    );
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    setGame(null);
    setRoom(null);
    if (!user) return;
    const key = `senai-game:${user.id}`;
    const read = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "null");
        setGame(
          saved && saved.until > Date.now() && games.some((g) => g.id === saved.id) ? saved : null,
        );
      } catch {
        setGame(null);
      }
    };
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [user?.id]);
  useEffect(() => {
    setOnline([]);
    setClassOnline([]);
    setConnected(false);
    if (!user) return;
    const list = (["geral", ...(turma ? [turma] : [])] as Space[]).map((scope) => ({
      scope,
      ready: false,
      ch: supabase.channel(
        scope === "geral" ? "senai-voice:online" : `senai-voice:${scope}:online`,
        { config: { private: true, presence: { key: user.id } } },
      ),
    }));
    channels.current = list;
    const sync = () =>
      list.forEach((item) => {
        const values = Object.values(item.ch.presenceState<ActivityMember>())
          .flat()
          .map((m) => ({ ...m, room: visibleRoom(m.room, item.scope) }));
        (item.scope === "geral" ? setOnline : setClassOnline)(mergeActivity(values));
      });
    list.forEach((item) =>
      item.ch.on("presence", { event: "sync" }, sync).subscribe((status) => {
        item.ready = status === "SUBSCRIBED";
        if (item.scope === "geral") setConnected(item.ready);
        if (item.ready)
          void item.ch.track({
            id: user.id,
            name,
            room: visibleRoom(current.current.room, item.scope),
            game: current.current.game?.id ?? null,
            gameUntil: current.current.game?.until ?? 0,
          });
      }),
    );
    const timer = window.setInterval(sync, 15000);
    return () => {
      window.clearInterval(timer);
      channels.current = [];
      list.forEach((item) => void supabase.removeChannel(item.ch));
    };
  }, [user?.id, turma, name]);
  useEffect(() => {
    if (!user) return;
    channels.current.forEach((item) => {
      if (item.ready)
        void item.ch.track({
          id: user.id,
          name,
          room: visibleRoom(room, item.scope),
          game: game?.id ?? null,
          gameUntil: game?.until ?? 0,
        });
    });
  }, [room, game, user?.id, name]);
  const stopGame = useCallback(() => {
    setGame(null);
    if (user) {
      try {
        localStorage.removeItem(`senai-game:${user.id}`);
      } catch {
        /* Optional storage. */
      }
    }
  }, [user?.id]);
  useEffect(() => {
    if (!game) return;
    const timer = window.setTimeout(stopGame, Math.max(0, game.until - Date.now()));
    return () => window.clearTimeout(timer);
  }, [game, stopGame]);
  const startGame = (id: string) => {
    if (!user || !games.some((g) => g.id === id && g.url)) return;
    const value = { id, until: Date.now() + 30 * 60 * 1000 };
    setGame(value);
    try {
      localStorage.setItem(`senai-game:${user.id}`, JSON.stringify(value));
    } catch {
      /* Optional storage. */
    }
  };
  return (
    <Context.Provider
      value={{ user, online, classOnline, connected, setRoom, startGame, stopGame }}
    >
      {children}
    </Context.Provider>
  );
}
