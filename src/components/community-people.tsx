import { useState } from "react";
import { Gamepad2, Headphones, MessageCircle, Search, Users } from "lucide-react";
import { games } from "@/data/games";
import type { ActivityMember } from "@/components/activity-presence";
import { ProfilePhoto } from "@/components/profile-photo";

export type DirectoryPerson = { id: string; display_name: string; avatarSrc?: string };
export function CommunityPeople({
  people,
  online,
  unreadIds,
  connected,
  onSelect,
}: {
  people: DirectoryPerson[];
  online: ActivityMember[];
  unreadIds: string[];
  connected: boolean;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"online" | "all" | "unread">("online");
  const [query, setQuery] = useState("");
  const presence = new Map(online.map((p) => [p.id, p]));
  const filtered = people.filter(
    (p) =>
      (filter === "all" || (filter === "online" ? presence.has(p.id) : unreadIds.includes(p.id))) &&
      p.display_name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const active = people.filter((p) => presence.get(p.id)?.room || presence.get(p.id)?.game);
  const status = (id: string) => {
    const p = presence.get(id);
    const game = games.find((g) => g.id === p?.game);
    return p?.room
      ? "Em sala de voz"
      : game
        ? `Jogando ${game.name}`
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
  return (
    <div className="people-view">
      <header className="people-toolbar">
        <h1>
          <Users size={18} /> Pessoas
        </h1>
        <span className="people-toolbar-rule" />
        <nav aria-label="Filtrar pessoas">
          <button
            type="button"
            aria-pressed={filter === "online"}
            onClick={() => setFilter("online")}
          >
            Online
          </button>
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            Todos
          </button>
          <button
            type="button"
            aria-pressed={filter === "unread"}
            onClick={() => setFilter("unread")}
          >
            Não lidas {unreadIds.length > 0 && <span>{unreadIds.length}</span>}
          </button>
        </nav>
        <button
          type="button"
          className="people-new"
          onClick={() => {
            setFilter("all");
            document.getElementById("people-search")?.focus();
          }}
        >
          Nova conversa
        </button>
      </header>
      <div className="people-body">
        <main className="people-main">
          <label className="people-search">
            <input
              id="people-search"
              aria-label="Buscar pessoas"
              placeholder="Buscar pessoas na comunidade"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Search size={16} />
          </label>
          <h2>
            {filter === "online"
              ? "ONLINE"
              : filter === "all"
                ? "TODOS OS COLEGAS"
                : "MENSAGENS NÃO LIDAS"}{" "}
            — {filtered.length}
          </h2>
          {!connected && filter === "online" ? (
            <p className="people-loading" role="status">
              Conectando à presença da comunidade…
            </p>
          ) : filtered.length ? (
            <div className="people-list">
              {filtered.map((p) => (
                <button
                  type="button"
                  className="people-row"
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                >
                  {avatar(p)}
                  <span>
                    <strong>{p.display_name}</strong>
                    <small>{status(p.id)}</small>
                  </span>
                  <span className="people-message-icon">
                    <MessageCircle size={17} />
                    <span className="sr-only">Conversar com {p.display_name}</span>
                  </span>
                </button>
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
                  : filter === "unread"
                    ? "Tudo em dia por aqui."
                    : filter === "online"
                      ? "O ponto de encontro está tranquilo."
                      : "A turma ainda está chegando."}
              </h3>
              <p>
                {query
                  ? "Tente buscar por outro nome."
                  : filter === "unread"
                    ? "Você não tem conversas com mensagens não lidas."
                    : filter === "online"
                      ? "Quando seus colegas estiverem online, eles aparecem aqui."
                      : "Os colegas da comunidade aparecem aqui quando seus perfis estiverem disponíveis."}
              </p>
              {filter === "online" && (
                <button type="button" onClick={() => setFilter("all")}>
                  Ver todos os colegas
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
                  Conversar com colega
                </p>
              </button>
            ))
          ) : (
            <div className="people-activity-empty">
              <h3>Por enquanto, tudo tranquilo.</h3>
              <p>
                Quando alguém entrar em uma sala de voz ou abrir um jogo, a atividade aparece aqui.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
