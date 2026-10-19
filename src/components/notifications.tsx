import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Bell, CheckCheck, Gamepad2, MessageCircle, Newspaper } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useActivityPresence } from "./activity-presence";
import { notificationHref, notificationText, type SiteNotification } from "@/lib/notifications";
import "./notifications.css";
const db = supabase as any;
type Inbox = {
  userId?: string;
  items: SiteNotification[];
  unread: number;
  total: number;
  loading: boolean;
  busy: boolean;
  error: string;
  refresh: () => Promise<void>;
  markRead: (id?: string) => Promise<boolean>;
  more: () => void;
};
const Context = createContext<Inbox | null>(null);
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useActivityPresence();
  const userId = user?.id;
  const [limit, setLimit] = useState(40);
  const [snapshot, setSnapshot] = useState<{
    owner?: string;
    items: SiteNotification[];
    unread: number;
    total: number;
  }>({ items: [], unread: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const identity = useRef(userId);
  identity.current = userId;
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!userId) return;
    const run = ++sequence.current;
    try {
      const [list, count] = await Promise.all([
        db
          .from("site_notifications")
          .select("*", { count: "exact" })
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(limit),
        db
          .from("site_notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .is("read_at", null),
      ]);
      if (identity.current !== userId || sequence.current !== run) return;
      if (list.error || count.error) throw list.error || count.error;
      setSnapshot({
        owner: userId,
        items: list.data ?? [],
        unread: count.count ?? 0,
        total: list.count ?? 0,
      });
      setError("");
    } catch {
      if (identity.current === userId && sequence.current === run)
        setError("Não foi possível atualizar as notificações. Tente novamente.");
    } finally {
      if (identity.current === userId && sequence.current === run) setLoading(false);
    }
  }, [userId, limit]);
  useEffect(() => {
    setLimit(40);
    setSnapshot({ owner: userId, items: [], unread: 0, total: 0 });
    setLoading(!!userId);
    setError("");
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    let live = true;
    const update = () => {
      if (live && !document.hidden) void refresh();
    };
    void refresh();
    const channel = supabase
      .channel(`site-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_notifications",
          filter: `user_id=eq.${userId}`,
        },
        update,
      )
      .subscribe();
    const timer = window.setInterval(update, 30000);
    window.addEventListener("focus", update);
    return () => {
      live = false;
      sequence.current++;
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      void supabase.removeChannel(channel);
    };
  }, [refresh, userId]);
  const markRead = async (id?: string) => {
    if (!userId) return false;
    setBusy(true);
    try {
      let query = db
        .from("site_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null);
      if (id) query = query.eq("id", id);
      const result = await query;
      if (result.error) throw result.error;
      if (identity.current === userId) await refresh();
      return true;
    } catch {
      if (identity.current === userId) setError("Não foi possível marcar a notificação como lida.");
      return false;
    } finally {
      if (identity.current === userId) setBusy(false);
    }
  };
  const owned = snapshot.owner === userId ? snapshot : { items: [], unread: 0, total: 0 };
  return (
    <Context.Provider
      value={{
        ...owned,
        userId,
        loading,
        busy,
        error,
        refresh,
        markRead,
        more: () => setLimit((n) => n + 40),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function NotificationBell() {
  const inbox = useContext(Context);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  if (!inbox?.userId) return null;
  const items = inbox.items.filter((n) => filter === "all" || !n.read_at);
  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) void inbox.refresh();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="notification-bell"
          aria-label={`Notificações${inbox.unread ? `, ${inbox.unread} não lidas` : ""}`}
          title="Notificações"
        >
          <Bell size={19} />
          {inbox.unread > 0 && <span>{inbox.unread > 99 ? "99+" : inbox.unread}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={12}
        className="notification-popover"
        aria-label="Central de notificações"
      >
        <header>
          <h2>Notificações</h2>
          <button
            type="button"
            disabled={!inbox.unread || inbox.busy}
            onClick={() => void inbox.markRead()}
          >
            <CheckCheck size={14} /> Marcar todas como lidas
          </button>
        </header>
        <nav aria-label="Filtrar notificações">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            Todas <span>{inbox.total}</span>
          </button>
          <button
            type="button"
            aria-pressed={filter === "unread"}
            onClick={() => setFilter("unread")}
          >
            Não lidas <span>{inbox.unread}</span>
          </button>
        </nav>
        {inbox.error && (
          <div className="notification-error" role="alert">
            {inbox.error}
            <button onClick={() => void inbox.refresh()}>Tentar novamente</button>
          </div>
        )}
        <div className="notification-list">
          {inbox.loading && !items.length ? (
            <p className="notification-empty" role="status">
              Carregando notificações…
            </p>
          ) : items.length ? (
            items.map((n) => (
              <a
                key={n.id}
                className={`notification-item ${!n.read_at ? "is-unread" : ""}`}
                href={notificationHref(n)}
                onClick={async (e) => {
                  e.preventDefault();
                  await inbox.markRead(n.id);
                  setOpen(false);
                  window.location.assign(notificationHref(n));
                }}
              >
                <span className="notification-avatar">
                  {n.actor_name.slice(0, 1).toUpperCase()}
                  <i>
                    {n.kind === "message" ? (
                      <MessageCircle size={10} />
                    ) : n.kind === "post" ? (
                      <Newspaper size={10} />
                    ) : (
                      <Gamepad2 size={10} />
                    )}
                  </i>
                </span>
                <span className="notification-copy">
                  <strong>{notificationText(n)}</strong>
                  <small>
                    {new Date(n.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    ·{" "}
                    {n.kind === "message"
                      ? "Mensagem privada"
                      : n.kind === "post"
                        ? "Nova publicação"
                        : "Convite para jogar"}
                  </small>
                </span>
                {!n.read_at && <span className="notification-dot" aria-label="Não lida" />}
              </a>
            ))
          ) : (
            <p className="notification-empty">
              {filter === "unread"
                ? inbox.unread > 0
                  ? "Há notificações não lidas anteriores. Carregue mais para vê-las."
                  : "Você está em dia. Nenhuma notificação não lida."
                : "Suas mensagens, publicações de quem você segue e convites para jogar aparecem aqui."}
            </p>
          )}
        </div>
        {inbox.items.length < inbox.total && (
          <button type="button" className="notification-more" onClick={inbox.more}>
            Carregar mais
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
