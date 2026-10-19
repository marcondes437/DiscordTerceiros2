import { useRef, useState, type ReactNode } from "react";
import { Gamepad2, Headphones, MessageCircle, Search, Users } from "lucide-react";
import { gameActivity } from "@/lib/game-activity";
import type { ActivityMember } from "@/components/activity-presence";
import { ProfilePhoto } from "@/components/profile-photo";
import { FriendActions } from "./friend-actions";
import {
  friendshipState,
  friendshipWith,
  matchesPersonName,
  type Friendship,
  type FriendAction,
} from "@/lib/friendships";
export type DirectoryPerson = { id: string; display_name: string; avatarSrc?: string };
export function CommunityPeople({
  themeControl,
  section = "friends",
  people,
  online,
  unreadIds,
  connected,
  onSelect,
  selfId,
  friendships,
  busy,
  onFriendAction,
  loading = false,
}: {
  themeControl?: ReactNode;
  section?: "friends" | "requests";
  people: DirectoryPerson[];
  online: ActivityMember[];
  unreadIds: string[];
  connected: boolean;
  onSelect: (id: string) => void;
  selfId: string;
  friendships: Friendship[];
  busy: boolean;
  onFriendAction: (id: string, action: FriendAction) => void;
  loading?: boolean;
}) {
  const [friendFilter, setFilter] = useState<"online" | "all" | "unread" | "pending" | "add">(
    "online",
  );
  const filter = section === "requests" ? "requests" : friendFilter;
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const presence = new Map(online.map((p) => [p.id, p]));
  const relation = (id: string) => friendshipState(friendships, selfId, id);
  const incoming = friendships.filter(
    (f) => f.recipient_id === selfId && f.status === "pending" && f.request_kind !== "message",
  ).length;
  const filtered = people.filter(
    (p) =>
      p.id !== selfId &&
      (filter === "requests"
        ? friendshipWith(friendships, selfId, p.id)?.request_kind === "message" &&
          ["incoming", "outgoing"].includes(relation(p.id))
        : filter === "add"
          ? relation(p.id) !== "friend"
          : filter === "pending"
            ? ["incoming", "outgoing"].includes(relation(p.id)) &&
              friendshipWith(friendships, selfId, p.id)?.request_kind !== "message"
            : relation(p.id) === "friend" &&
              (filter === "all" ||
                (filter === "online" ? presence.has(p.id) : unreadIds.includes(p.id)))) &&
      matchesPersonName(p.display_name, query),
  );
  const active = people.filter(
    (p) => relation(p.id) === "friend" && (presence.get(p.id)?.room || presence.get(p.id)?.game),
  );
  const status = (id: string) => {
    const p = presence.get(id);
    const game = gameActivity(p);
    return game
      ? `Jogando ${game.name}`
      : p?.room
        ? "Em sala de voz"
        : p
          ? "Online na comunidade"
          : "Offline";
  };
  const avatar = (p: DirectoryPerson) => (
    <span className={`people-avatar ${presence.has(p.id) ? "is-online" : ""}`}>
      {p.avatarSrc ? (
        <ProfilePhoto src={p.avatarSrc} alt="" />
      ) : (
        p.display_name.slice(0, 1).toUpperCase()
      )}
      <i />
    </span>
  );
  const add = () => {
    setFilter("add");
    setQuery("");
    input.current?.focus();
  };
  return (
    <div className="people-view">
      <header className="people-toolbar">
        <h1>
          <Users size={18} /> {section === "requests" ? "Solicitações de mensagens" : "Amigos"}
        </h1>
        <span className="people-toolbar-rule" />
        {section === "friends" && (
          <>
            <nav aria-label="Filtrar amigos">
              <button
                type="button"
                aria-pressed={filter === "online"}
                onClick={() => setFilter("online")}
              >
                Online
              </button>
              <button
                type="button"
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              >
                Todos
              </button>
              <button
                type="button"
                aria-pressed={filter === "pending"}
                onClick={() => setFilter("pending")}
              >
                Pendentes {incoming > 0 && <span>{incoming}</span>}
              </button>
              <button
                type="button"
                aria-pressed={filter === "unread"}
                onClick={() => setFilter("unread")}
              >
                Não lidas
              </button>
            </nav>
            <button
              type="button"
              className="people-new"
              onClick={add}
              aria-pressed={filter === "add"}
            >
              Adicionar amigos
            </button>
          </>
        )}
        {themeControl}
      </header>
      <div className="people-body">
        <main className="people-main">
          {filter === "requests" && (
            <div className="friend-discovery-intro">
              <h2>Você escolhe quem pode conversar.</h2>
              <p>
                Estes pedidos não contêm mensagens. Ao aceitar, vocês se tornam amigos e a conversa
                privada é liberada. Você também pode recusar ou cancelar um pedido enviado.
              </p>
            </div>
          )}
          {filter === "add" && (
            <div className="friend-discovery-intro">
              <h2>Encontre sua turma.</h2>
              <p>
                Envie um pedido de amizade. A conversa privada fica disponível depois que a outra
                pessoa aceitar.
              </p>
            </div>
          )}
          <label className="people-search">
            <input
              ref={input}
              aria-label="Buscar pessoas"
              placeholder={filter === "add" ? "Buscar colegas para adicionar" : "Buscar amigos"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Search size={16} />
          </label>
          <h2>
            {filter === "requests"
              ? "SOLICITAÇÕES DE CONVERSA"
              : filter === "online"
                ? "AMIGOS ONLINE"
                : filter === "all"
                  ? "TODOS OS AMIGOS"
                  : filter === "pending"
                    ? "PEDIDOS DE AMIZADE"
                    : filter === "add"
                      ? "COLEGAS DA COMUNIDADE"
                      : "AMIGOS COM MENSAGENS NÃO LIDAS"}{" "}
            — {filtered.length}
          </h2>
          {loading || (!connected && filter === "online") ? (
            <p className="people-loading" role="status">
              Carregando suas amizades…
            </p>
          ) : filtered.length ? (
            <div className="people-list">
              {filtered.map((p) => (
                <div
                  className="people-row"
                  key={p.id}
                  role="group"
                  aria-label={`Colega ${p.display_name}`}
                >
                  {avatar(p)}
                  <span>
                    <strong>{p.display_name}</strong>
                    <small>
                      {relation(p.id) === "incoming"
                        ? "Quer ser seu amigo"
                        : relation(p.id) === "outgoing"
                          ? "Aguardando aceitar"
                          : status(p.id)}
                    </small>
                  </span>
                  {relation(p.id) === "friend" && (
                    <button
                      type="button"
                      className="people-message-icon"
                      aria-label={`Conversar com ${p.display_name}`}
                      onClick={() => onSelect(p.id)}
                    >
                      <MessageCircle size={17} />
                    </button>
                  )}
                  <FriendActions
                    allowConversationRequest={filter === "add"}
                    messageRequest={
                      friendshipWith(friendships, selfId, p.id)?.request_kind === "message"
                    }
                    state={relation(p.id)}
                    busy={busy}
                    onAction={(action) => onFriendAction(p.id, action)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="people-empty">
              <div className="people-empty-art" aria-hidden="true">
                <span />
                <MessageCircle size={56} />
                <span />
              </div>
              <h3>
                {query
                  ? "Ninguém com esse nome."
                  : filter === "pending" || filter === "requests"
                    ? "Nenhum pedido pendente."
                    : filter === "unread"
                      ? "Tudo em dia por aqui."
                      : filter === "add"
                        ? "Nenhum colega para adicionar."
                        : "Seus amigos aparecem aqui."}
              </h3>
              <p>
                {filter === "requests"
                  ? "Os pedidos para conversar aparecem aqui, sem liberar o envio de mensagens antes do seu aceite."
                  : filter === "pending"
                    ? "Pedidos recebidos e enviados ficam nesta aba."
                    : filter === "unread"
                      ? "Você não tem mensagens não lidas de amigos."
                      : "Entrar na comunidade não cria uma amizade nem uma conversa. Adicione alguém para começar."}
              </p>
              {filter !== "add" && filter !== "requests" && (
                <button type="button" onClick={add}>
                  Encontrar colegas
                </button>
              )}
            </div>
          )}
        </main>
        <aside className="people-activity">
          <h2>ATIVO AGORA</h2>
          {active.length ? (
            active.map((p) => (
              <button
                type="button"
                className="people-activity-card"
                key={p.id}
                onClick={() => onSelect(p.id)}
              >
                <div>
                  {avatar(p)}
                  <span>
                    <strong>{p.display_name}</strong>
                    <small>{status(p.id)}</small>
                  </span>
                </div>
                <p>
                  {presence.get(p.id)?.room ? <Headphones size={15} /> : <Gamepad2 size={15} />}{" "}
                  Conversar com amigo
                </p>
              </button>
            ))
          ) : (
            <div className="people-activity-empty">
              <h3>Por enquanto, tudo tranquilo.</h3>
              <p>A atividade dos seus amigos em voz e nos jogos aparece aqui.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
