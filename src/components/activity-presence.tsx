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
import { cleanGameName, gameActivity, type GameActivity } from "@/lib/game-activity";
export type ActivityMember = {
  id: string;
  name: string;
  room: string | null;
  game?: string | null | undefined;
  gameUntil?: number | undefined;
  gameName?: string | null | undefined;
  gameStartedAt?: number | undefined;
};
export function mergeActivity(members: ActivityMember[], now = Date.now()) {
  const result = new Map<string, ActivityMember>();
  for (const m of members) {
    if (!m.id) continue;
    const old = result.get(m.id);
    const incoming = gameActivity(m, now);
    const previous = gameActivity(old, now);
    const selected =
      incoming && (!previous || (incoming.startedAt ?? 0) >= (previous.startedAt ?? 0))
        ? incoming
        : previous;
    result.set(m.id, {
      ...m,
      room: m.room || old?.room || null,
      game: selected?.id ?? null,
      gameUntil: selected?.until,
      gameName: selected?.name ?? null,
      gameStartedAt: selected?.startedAt ?? undefined,
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
  currentGame?: GameActivity | null;
  setCustomGame: (name: string) => void;
};
const Context = createContext<Activity>({
  user: null,
  online: [],
  classOnline: [],
  connected: false,
  setRoom: () => {},
  startGame: () => {},
  stopGame: () => {},
  setCustomGame: () => {},
});
export const useActivityPresence = () => useContext(Context);
export function ActivityPresence({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [online, setOnline] = useState<ActivityMember[]>([]);
  const [classOnline, setClassOnline] = useState<ActivityMember[]>([]);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<string | null>(null);
  const [game, setGame] = useState<GameActivity | null>(null);
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
        const valid = gameActivity({
          game: saved?.id,
          gameName: saved?.name,
          gameUntil: saved?.until,
          gameStartedAt: saved?.startedAt,
        });
        setGame(
          valid
            ? {
                id: valid.id,
                name: valid.name,
                until: valid.until,
                startedAt: valid.startedAt ?? Date.now(),
              }
            : null,
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
            gameName: current.current.game?.name ?? null,
            gameStartedAt: current.current.game?.startedAt ?? 0,
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
          gameName: game?.name ?? null,
          gameStartedAt: game?.startedAt ?? 0,
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
    const value = {
      id,
      startedAt: current.current.game?.id === id ? current.current.game.startedAt : Date.now(),
      until: Date.now() + 30 * 60 * 1000,
    };
    setGame(value);
    try {
      localStorage.setItem(`senai-game:${user.id}`, JSON.stringify(value));
    } catch {
      /* Optional storage. */
    }
  };
  const setCustomGame = (value: string) => {
    const name = cleanGameName(value);
    if (!user || !name) return;
    const next = {
      id: "custom",
      name,
      startedAt: Date.now(),
      until: Date.now() + 2 * 60 * 60 * 1000,
    };
    setGame(next);
    try {
      localStorage.setItem(`senai-game:${user.id}`, JSON.stringify(next));
    } catch {
      /* Optional storage. */
    }
  };
  return (
    <Context.Provider
      value={{
        user,
        online,
        classOnline,
        connected,
        setRoom,
        startGame,
        stopGame,
        currentGame: game,
        setCustomGame,
      }}
    >
      {children}
    </Context.Provider>
  );
}
