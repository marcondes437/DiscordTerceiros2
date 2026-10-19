import { useFriendships } from "@/hooks/use-friendships";
import { friendshipState, friendshipWith, conversationIds } from "@/lib/friendships";
import { FriendActions } from "./friend-actions";
import { CommunityPeople } from "./community-people";
import { useActivityPresence, mergeActivity } from "./activity-presence";
import "@/routes/community-people.css";
import { AvatarDecoration, ProfileEffect } from "./profile-decorations";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, MessageCircle, SendHorizontal, Users, Trash2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CommunityProfile } from "@/hooks/use-community-profiles";

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};
type Person = { id: string; display_name: string };
// These tables are defined in supabase/direct-messages.sql and supabase/social.sql.
const db = supabase as any;

export function DirectMessages({
  themeControl,
  user,
  onSignIn,
  open,
  setOpen,
  sidebarTarget,
  mainTarget,
  profiles = {},
  requestedRecipient,
}: {
  themeControl?: ReactNode;
  requestedRecipient?: string | null;
  profiles?: Record<string, CommunityProfile>;
  user: User | null;
  onSignIn: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  sidebarTarget: HTMLElement | null;
  mainTarget: HTMLElement | null;
}) {
  const friends = useFriendships(user?.id);
  const [section, setSection] = useState<"friends" | "requests">("friends");
  const activity = useActivityPresence();
  const livePeople = mergeActivity([...activity.online, ...activity.classOnline]);
  const [people, setPeople] = useState<Person[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setSelected(requestedRecipient || null);
      setDraft("");
    }
  }, [open, requestedRecipient]);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const unread = messages.filter((m) => m.recipient_id === user?.id && !m.read_at).length;
  const pendingFriends = friends.rows.filter(
    (f) => f.recipient_id === user?.id && f.status === "pending" && f.request_kind !== "message",
  ).length;
  const pendingMessages = friends.rows.filter(
    (f) => f.recipient_id === user?.id && f.status === "pending" && f.request_kind === "message",
  ).length;
  const notificationCount = unread + pendingFriends + pendingMessages;
  const directory = people.map((p) => ({ ...p, ...profiles[p.id] }));
  const existingIds = conversationIds(messages, user?.id);
  const inbox = directory.filter(
    (p) =>
      existingIds.has(p.id) ||
      (p.id === selected && friendshipState(friends.rows, user?.id, p.id) === "friend"),
  );
  const selectedState = friendshipState(friends.rows, user?.id, selected);
  const canMessage = !!selected && selectedState === "friend" && !friends.loading && !friends.error;
  const person = directory.find((p) => p.id === selected);
  const conversation = messages.filter(
    (m) => m.sender_id === selected || m.recipient_id === selected,
  );

  const load = useCallback(async () => {
    if (!user) return;
    const result = await db
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (result.error) {
      setError("Não foi possível carregar suas mensagens. Tente novamente.");
      return;
    }
    setMessages((result.data ?? []).reverse());
    setError("");
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setPeople([]);
      setSelected(null);
      setOpen(false);
      return;
    }
    let live = true;
    const refresh = async () => {
      if (!document.hidden && live) await load();
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [load, user?.id]);

  useEffect(() => {
    if (!open || !user) return;
    let live = true;
    const name = String(
      user.user_metadata?.display_name || user.user_metadata?.full_name || "Aluno",
    ).slice(0, 60);
    void (async () => {
      await db
        .from("social_profiles")
        .upsert({ id: user.id, display_name: name }, { onConflict: "id", ignoreDuplicates: true });
      const result = await db
        .from("social_profiles")
        .select("id,display_name")
        .neq("id", user.id)
        .order("display_name");
      if (!live) return;
      if (result.error) setError("Não foi possível carregar os colegas. Tente novamente.");
      else setPeople(result.data ?? []);
    })();
    return () => {
      live = false;
    };
  }, [open, user?.id]);

  useEffect(() => {
    if (!open || !selected || !user) return;
    const unreadIds = messages
      .filter((m) => m.sender_id === selected && m.recipient_id === user.id && !m.read_at)
      .map((m) => m.id);
    if (!unreadIds.length) return;
    void db
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(({ error: err }: { error: unknown }) => {
        if (!err) void load();
      });
  }, [open, selected, messages, user?.id, load]);

  useEffect(() => {
    if (open) bottom.current?.scrollIntoView({ block: "nearest" });
  }, [open, selected, conversation.at(-1)?.id]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !selected || !draft.trim() || sending || !canMessage) return;
    setSending(true);
    try {
      const result = await db
        .from("direct_messages")
        .insert({ sender_id: user.id, recipient_id: selected, body: draft.trim() });
      if (result.error) {
        setError(
          result.error.code === "42501"
            ? "O envio foi bloqueado. Verifique se vocês ainda são amigos. Seu texto foi mantido."
            : "Não foi possível enviar a mensagem. Seu texto foi mantido.",
        );
        void friends.refresh();
      } else {
        setDraft("");
        await load();
      }
    } catch {
      setError("Falha na conexão. Tente enviar novamente.");
    } finally {
      setSending(false);
    }
  }

  async function removeMessage(message: Message) {
    if (!user || message.sender_id !== user.id || deleting) return;
    setDeleting(message.id);
    try {
      const result = await db
        .from("direct_messages")
        .delete()
        .eq("id", message.id)
        .eq("sender_id", user.id)
        .select("id");
      if (result.error) throw result.error;
      setMessages((current) => current.filter((m) => m.id !== message.id));
      setError("");
    } catch {
      setError("Não foi possível apagar a mensagem. Tente novamente.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <button
        className="direct-messages-launch"
        type="button"
        title="Mensagens privadas"
        aria-pressed={open}
        aria-label={`Amigos e mensagens${notificationCount ? `, ${notificationCount} notificações` : ""}`}
        onClick={() => (user ? setOpen(true) : onSignIn())}
      >
        <strong>
          <MessageCircle size={24} />
        </strong>
        {notificationCount > 0 && (
          <span className="direct-unread">
            {notificationCount > 99 ? "99+" : notificationCount}
          </span>
        )}
      </button>
      <div className="direct-rail-separator" />
      {open &&
        sidebarTarget &&
        createPortal(
          <div className="direct-inbox">
            <label className="direct-find">
              <span className="sr-only">Encontrar colega</span>
              <input
                aria-label="Encontrar colega"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Encontrar ou começar uma conversa"
              />
            </label>
            <button type="button" className="direct-directory-link" onClick={() => setOpen(false)}>
              <ArrowLeft size={16} />
              <span>Voltar aos canais</span>
            </button>
            <button
              type="button"
              className={`direct-directory-link ${!selected && section === "friends" ? "is-active" : ""}`}
              onClick={() => {
                setSelected(null);
                setSection("friends");
              }}
            >
              <Users size={18} />
              <strong>Amigos</strong>
              {pendingFriends > 0 && <span className="inbox-badge">{pendingFriends}</span>}
            </button>
            <button
              type="button"
              className={`direct-directory-link ${!selected && section === "requests" ? "is-active" : ""}`}
              onClick={() => {
                setSelected(null);
                setSection("requests");
              }}
            >
              <Mail size={18} />
              <span>Solicitações de mensagens</span>
              {pendingMessages > 0 && <span className="inbox-badge">{pendingMessages}</span>}
            </button>
            <div className="direct-inbox-heading">
              <MessageCircle size={18} />
              <strong>Mensagens diretas</strong>
            </div>
            <div className="direct-people">
              {inbox
                .filter((p) => p.display_name.toLowerCase().includes(search.toLowerCase()))
                .map((p) => (
                  <button
                    className={selected === p.id ? "is-active" : ""}
                    key={p.id}
                    onClick={() => {
                      setSelected(p.id);
                      setDraft("");
                    }}
                  >
                    <span className="mini-avatar">
                      {p.avatarSrc ? (
                        <img src={p.avatarSrc} alt="" />
                      ) : (
                        p.display_name.slice(0, 1).toUpperCase()
                      )}
                      <AvatarDecoration theme={p.avatar_decoration} />
                    </span>
                    <span>{p.display_name}</span>
                    {messages.some(
                      (m) => m.sender_id === p.id && m.recipient_id === user?.id && !m.read_at,
                    ) && <i aria-label="Mensagens não lidas" />}
                  </button>
                ))}
              {!inbox.length && <p>Suas conversas aparecem aqui depois da primeira mensagem.</p>}
            </div>
          </div>,
          sidebarTarget,
        )}
      {open &&
        mainTarget &&
        createPortal(
          <div className="direct-workspace">
            {friends.error && (
              <div className="direct-error" role="alert">
                {friends.error}
                <button onClick={() => void friends.refresh()}>Atualizar amizades</button>
              </div>
            )}
            {!selected ? (
              <>
                <CommunityPeople
                  section={section}
                  themeControl={themeControl}
                  selfId={user?.id || ""}
                  friendships={friends.rows}
                  busy={friends.busy}
                  loading={friends.loading}
                  onFriendAction={(id, action) => void friends.act(id, action)}
                  people={directory}
                  online={livePeople.filter((p) => p.id !== user?.id)}
                  unreadIds={[
                    ...new Set(
                      messages
                        .filter((m) => m.recipient_id === user?.id && !m.read_at)
                        .map((m) => m.sender_id),
                    ),
                  ]}
                  connected={activity.connected}
                  onSelect={(id) => {
                    setSelected(id);
                    setDraft("");
                  }}
                />
                {error && (
                  <div className="direct-error" role="alert">
                    {error}
                    <button onClick={() => void load()}>Tentar novamente</button>
                  </div>
                )}
              </>
            ) : (
              <>
                <header className="direct-topbar">
                  <button
                    className="icon-btn"
                    aria-label="Voltar aos canais"
                    onClick={() => setOpen(false)}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <span className="mini-avatar">
                    {person?.avatarSrc ? (
                      <img src={person.avatarSrc} alt="" />
                    ) : (
                      (person?.display_name.slice(0, 1).toUpperCase() ?? "@")
                    )}
                  </span>
                  <h1>{person?.display_name ?? "Mensagens diretas"}</h1>
                  <span className="direct-private-label">Conversa privada</span>
                  {themeControl}
                </header>
                <div className="direct-workspace-body">
                  <section className="direct-chat" aria-label="Conversa privada">
                    {error && (
                      <div className="direct-error" role="alert">
                        {error}
                        <button onClick={() => void load()}>Tentar novamente</button>
                      </div>
                    )}
                    <div className="direct-history" aria-live="polite">
                      {!selected ? (
                        <div className="direct-welcome">
                          <MessageCircle size={52} />
                          <h2>Suas conversas, seu espaço.</h2>
                          <p>Escolha um colega na lista para conversar em privado.</p>
                        </div>
                      ) : (
                        <>
                          <div className="direct-conversation-intro">
                            <span className="direct-profile-avatar">
                              {person?.avatarSrc ? (
                                <img src={person.avatarSrc} alt="" />
                              ) : (
                                person?.display_name.slice(0, 1).toUpperCase()
                              )}
                              <AvatarDecoration theme={person?.avatar_decoration} />
                            </span>
                            <h2>{person?.display_name}</h2>
                            <p>
                              {canMessage
                                ? `Sua conversa com ${person?.display_name}.`
                                : "Uma amizade aceita é necessária para conversar em privado."}
                            </p>
                          </div>
                          {conversation.map((m) => (
                            <article className="direct-line" key={m.id}>
                              <span className="mini-avatar">
                                {profiles[m.sender_id]?.avatarSrc ? (
                                  <img src={profiles[m.sender_id].avatarSrc} alt="" />
                                ) : (
                                  (
                                    profiles[m.sender_id]?.display_name ||
                                    (m.sender_id === user?.id ? "V" : person?.display_name || "?")
                                  )
                                    .slice(0, 1)
                                    .toUpperCase()
                                )}
                              </span>
                              <div>
                                <header>
                                  <strong>
                                    {m.sender_id === user?.id ? "Você" : person?.display_name}
                                  </strong>
                                  <time>
                                    {new Date(m.created_at).toLocaleString("pt-BR", {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })}
                                  </time>
                                </header>
                                <p>{m.body}</p>
                              </div>
                              {m.sender_id === user?.id && (
                                <button
                                  type="button"
                                  className="direct-delete-message"
                                  aria-label="Apagar minha mensagem"
                                  title="Apagar mensagem"
                                  disabled={deleting === m.id}
                                  onClick={() => void removeMessage(m)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </article>
                          ))}
                        </>
                      )}
                      <div ref={bottom} />
                    </div>
                    <div className="friend-conversation-gate">
                      {!canMessage && (
                        <p>
                          Para enviar mensagens privadas, primeiro aceite ou tenha seu pedido de
                          amizade aceito.
                        </p>
                      )}
                      <FriendActions
                        allowConversationRequest
                        messageRequest={
                          friendshipWith(friends.rows, user?.id, selected)?.request_kind ===
                          "message"
                        }
                        state={selectedState}
                        busy={friends.busy || friends.loading}
                        onAction={(action) => selected && void friends.act(selected, action)}
                      />
                    </div>
                    <form className="direct-compose" onSubmit={send}>
                      <input
                        aria-label="Mensagem privada"
                        placeholder={
                          canMessage
                            ? "Conversar com @" + (person?.display_name ?? "colega")
                            : "Amizade aceita necessária para enviar"
                        }
                        disabled={!canMessage}
                        maxLength={2000}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                      />
                      <button
                        disabled={!canMessage || !draft.trim() || sending}
                        aria-label="Enviar mensagem privada"
                      >
                        <SendHorizontal size={20} />
                      </button>
                    </form>
                  </section>
                  {person && (
                    <aside className="direct-person-profile">
                      <ProfileEffect theme={person.profile_effect} />
                      <div
                        className="direct-profile-cover"
                        style={{ backgroundColor: person.banner_color }}
                      >
                        {person.bannerSrc && <img src={person.bannerSrc} alt="" />}
                      </div>
                      <div className="direct-profile-details">
                        <span className="direct-profile-avatar">
                          {person.avatarSrc ? (
                            <img src={person.avatarSrc} alt="" />
                          ) : (
                            person.display_name.slice(0, 1).toUpperCase()
                          )}
                          <AvatarDecoration theme={person.avatar_decoration} />
                        </span>
                        <h2>{person.display_name}</h2>
                        <p>{person.bio || "Aluno da comunidade"}</p>
                        <div className="direct-profile-note">
                          <strong>Conversa privada</strong>
                          <p>Apenas você e {person.display_name} podem ler estas mensagens.</p>
                        </div>
                      </div>
                    </aside>
                  )}
                </div>
              </>
            )}
          </div>,
          mainTarget,
        )}
    </>
  );
}
