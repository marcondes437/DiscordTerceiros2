import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Gamepad2,
  Hash,
  Headphones,
  Search,
  UserPlus,
  Users,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfilePhoto } from "@/components/profile-photo";

type HubPerson = { id: string; name: string; avatar?: string | null; room?: string | null };
type HubRoom = { id: string; name: string; people: HubPerson[] };
type HubChannel = { id: string; name: string; about: string };
type Props = {
  name: string;
  avatar?: string | null;
  space: string;
  online: HubPerson[];
  groups: { label: string; channels: HubChannel[] }[];
  rooms: HubRoom[];
  joinedRoom: string | null;
  onChannel: (id: string) => void;
  onRoom: (id: string) => void;
  onPerson: (id: string) => void;
  onInvite: () => void;
  onProfile: () => void;
};
function Portrait({ person }: { person: HubPerson }) {
  return (
    <span className="hub-avatar">
      {person.avatar ? (
        <ProfilePhoto src={person.avatar} alt={person.name} />
      ) : (
        person.name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
export function CommunityHub({
  name,
  avatar,
  space,
  online,
  groups,
  rooms,
  joinedRoom,
  onChannel,
  onRoom,
  onPerson,
  onInvite,
  onProfile,
}: Props) {
  const [query, setQuery] = useState("");
  const matches = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(
        query
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim(),
      );
  const filteredGroups = groups
    .map((g) => ({
      ...g,
      channels: g.channels.filter((c) => matches(`${c.name} ${c.about} ${g.label}`)),
    }))
    .filter((g) => g.channels.length);
  const filteredRooms = rooms.filter((r) => matches(r.name));
  const occupied = rooms.filter((r) => r.people.length).length;
  return (
    <div className="community-hub">
      <div className="hub-content">
        <section className="hub-welcome">
          <img src="/art/crimson-world.svg" alt="" />
          <div>
            <span>SEU PONTO DE ENCONTRO / {space.toUpperCase()}</span>
            <h2>A turma se encontra aqui.</h2>
            <p>Uma conversa, uma ideia ou a próxima partida. Escolha por onde começar.</p>
            <div className="hub-welcome-status">
              <span>
                <i />
                {online.length} online agora
              </span>
              <span>
                <Headphones size={13} />
                {occupied} {occupied === 1 ? "sala em atividade" : "salas em atividade"}
              </span>
            </div>
          </div>
        </section>
        <div className="hub-discovery-bar">
          <div>
            <span>EXPLORE O SEU ESPAÇO</span>
            <h2>Encontre sua conversa</h2>
          </div>
          <label className="hub-search">
            <Search size={15} />
            <input
              aria-label="Buscar canais e salas"
              placeholder="Buscar canais e salas"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <section className="hub-section" aria-label="Salas de voz">
          <div className="hub-section-title">
            <h3>
              <Volume2 size={17} /> Salas de voz
            </h3>
            <span>{rooms.length} disponíveis</span>
          </div>
          <div className="hub-rooms">
            {filteredRooms.map((room) => (
              <article className={`hub-room ${room.people.length ? "is-live" : ""}`} key={room.id}>
                <div className="hub-room-icon">
                  <Headphones size={21} />
                </div>
                <div className="hub-room-copy">
                  <h4>{room.name}</h4>
                  <p>
                    {room.people.length
                      ? `${room.people.length} em chamada`
                      : "A sala está livre. Puxe uma conversa."}
                  </p>
                  {room.people.length > 0 && (
                    <div className="hub-face-stack">
                      {room.people.slice(0, 4).map((p) => (
                        <Portrait key={p.id} person={p} />
                      ))}
                      {room.people.length > 4 && <span>+{room.people.length - 4}</span>}
                    </div>
                  )}
                </div>
                <Button size="sm" onClick={() => onRoom(room.id)}>
                  {joinedRoom === room.id ? "Voltar" : "Entrar"}
                </Button>
              </article>
            ))}
          </div>
          {!filteredRooms.length && <p className="hub-empty">Nenhuma sala encontrada.</p>}
        </section>
        {filteredGroups.map((group, index) => (
          <section className="hub-section" key={group.label}>
            <div className="hub-section-title">
              <h3>{group.label}</h3>
              <span>{group.channels.length} canais</span>
            </div>
            <div className="hub-channel-grid">
              {group.channels.map((channel, i) => (
                <button
                  type="button"
                  key={channel.id}
                  className={`hub-channel hub-channel-tone-${(index + i) % 4}`}
                  onClick={() => onChannel(channel.id)}
                >
                  <div className="hub-channel-art">
                    <span>
                      <Hash size={23} />
                    </span>
                    <ArrowUpRight size={17} />
                  </div>
                  <div className="hub-channel-info">
                    <h4>#{channel.name}</h4>
                    <p>{channel.about}</p>
                    <span>
                      Entrar na conversa <ArrowUpRight size={12} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
        {!filteredGroups.length && <p className="hub-empty">Nenhum canal encontrado.</p>}
        <Link to="/jogos" className="hub-game-banner">
          <span className="hub-game-icon">
            <Gamepad2 size={26} />
          </span>
          <div>
            <span>PAUSA PARA JOGAR</span>
            <h3>Seu próximo intervalo tem companhia.</h3>
            <p>Abra uma sala no Rabisco ou no SlitherSenai.</p>
          </div>
          <ArrowUpRight size={21} />
        </Link>
      </div>
      <aside className="hub-right" aria-label="Sua comunidade">
        <section className="hub-self">
          <div className="hub-self-cover" />
          <Portrait person={{ id: "self", name, avatar }} />
          <h2>{name}</h2>
          <p>Seu lugar na turma.</p>
          <button type="button" onClick={onProfile}>
            Editar meu perfil <ArrowUpRight size={12} />
          </button>
        </section>
        <section className="hub-people">
          <div className="hub-section-title">
            <h3>
              <Users size={15} /> Online agora
            </h3>
            <span>{online.length}</span>
          </div>
          {online.map((person) => (
            <button
              type="button"
              className="hub-person"
              key={person.id}
              onClick={() => onPerson(person.id)}
            >
              <Portrait person={person} />
              <span>
                <strong>{person.name}</strong>
                <small>{person.room ? "Em sala de voz" : "Na comunidade"}</small>
              </span>
              <i />
            </button>
          ))}
          {!online.length && <p className="hub-empty">A presença da turma aparece aqui.</p>}
        </section>
        <section className="hub-invite">
          <UserPlus size={22} />
          <h3>A comunidade fica melhor junto.</h3>
          <p>Compartilhe o espaço com quem faz parte da sua turma.</p>
          <Button variant="outline" size="sm" onClick={onInvite}>
            Convidar a turma
          </Button>
        </section>
      </aside>
    </div>
  );
}
