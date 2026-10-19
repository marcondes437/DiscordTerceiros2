import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Gamepad2,
  Headphones,
  MessageCircle,
  Play,
  Radio,
  Trophy,
  Users,
} from "lucide-react";
import { games } from "@/data/games";
import { ProfilePhoto } from "@/components/profile-photo";
type Member = { id: string; name: string; avatar?: string };
export function GameyHero({
  members,
  connected,
  players,
  calls,
}: {
  members: Member[];
  connected: boolean;
  players: number;
  calls: number;
}) {
  const [selected, setSelected] = useState(games[0].id);
  const game = games.find((g) => g.id === selected) || games[0];
  return (
    <section className="gamey-stage">
      <div className="gamey-aura" aria-hidden="true" />
      <div className="gamey-intro">
        <span className="gamey-eyebrow">
          <i /> A NOSSA TURMA. O NOSSO UNIVERSO.
        </span>
        <h1>
          Converse. Jogue. Compartilhe.
          <br />
          <span>Tudo em um só lugar.</span>
        </h1>
        <p>
          O intervalo não precisa acabar. Encontre seus amigos,
          <br className="gamey-desktop-break" /> entre na partida e faça parte do que acontece aqui.
        </p>
        <div className="gamey-actions">
          <Link to="/comunidade" className="btn-red">
            <Headphones size={16} /> Entrar na comunidade <ArrowUpRight size={15} />
          </Link>
          <Link to="/jogos" className="gamey-text-link">
            Explorar os jogos <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      <div className="gamey-preview-wrap">
        <div className="gamey-preview-glow" aria-hidden="true" />
        <div className="gamey-preview" aria-label="Jogos e presença da comunidade">
          <header>
            <span className="gamey-preview-brand">
              <Gamepad2 size={19} />
              CONECTA
            </span>
            <span className="gamey-preview-status">
              <i />
              {connected ? `${members.length} online agora` : "Conectando à turma"}
            </span>
            <Link to="/jogos">
              Abrir catálogo <ArrowUpRight size={12} />
            </Link>
          </header>
          <div className="gamey-preview-body">
            <nav aria-label="Atalhos da prévia">
              <Link to="/jogos" className="is-active">
                <Gamepad2 size={15} />
                <span>Descobrir</span>
              </Link>
              <Link to="/comunidade">
                <Headphones size={15} />
                <span>Comunidade</span>
              </Link>
              <Link to="/social">
                <MessageCircle size={15} />
                <span>Social</span>
              </Link>
              <Link to="/perfil-jogos">
                <Trophy size={15} />
                <span>Meu perfil</span>
              </Link>
              <div className="gamey-preview-note">
                <Radio size={16} />
                <strong>
                  O ponto de encontro
                  <br />
                  da nossa turma.
                </strong>
                <span>Terceiro A + Terceiro B</span>
              </div>
            </nav>
            <div className="gamey-preview-main">
              <a
                className="gamey-game-feature"
                href={game.url || "/jogos"}
                aria-label={`Jogar ${game.name}`}
              >
                <img src={game.heroImage || game.image} alt="" />
                <div>
                  <span>FEITO PARA JOGAR JUNTO</span>
                  <h2>{game.name}</h2>
                  <p>
                    {game.id === "rabisco"
                      ? "Desenhe. Adivinhe. Dê risada."
                      : "Cresça. Desvie. Domine a arena."}
                  </p>
                  <span className="gamey-play">
                    <Play size={12} fill="currentColor" /> Jogar agora
                  </span>
                </div>
              </a>
              <div className="gamey-preview-games">
                {games.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={g.id === selected}
                    onClick={() => setSelected(g.id)}
                  >
                    <img src={g.image} alt="" />
                    <span>
                      <strong>{g.name}</strong>
                      <small>{g.categories[0]}</small>
                    </span>
                    <Play size={12} />
                  </button>
                ))}
              </div>
            </div>
            <aside className="gamey-preview-friends">
              <span>NA COMUNIDADE</span>
              {members.slice(0, 4).map((m) => (
                <Link to="/comunidade" key={m.id}>
                  <span className="gamey-member-avatar">
                    {m.avatar ? (
                      <ProfilePhoto src={m.avatar} alt="" />
                    ) : (
                      m.name.slice(0, 1).toUpperCase()
                    )}
                    <i />
                  </span>
                  <span>
                    <strong>{m.name}</strong>
                    <small>Online agora</small>
                  </span>
                </Link>
              ))}
              {!members.length && (
                <p>
                  Quando a turma entrar,
                  <br />
                  ela aparece por aqui.
                </p>
              )}
              <div>
                <Headphones size={18} />
                <strong>{calls}</strong>
                <span>em chamada</span>
              </div>
              <div>
                <Gamepad2 size={18} />
                <strong>{players}</strong>
                <span>com jogo aberto</span>
              </div>
            </aside>
          </div>
        </div>
      </div>
      <div className="gamey-stage-caption">
        <span>JOGOS DA TURMA</span>
        <span>CONVERSAS QUE CONECTAM</span>
        <span>MOMENTOS QUE FICAM</span>
      </div>
    </section>
  );
}
export function GameyFeatures() {
  return (
    <section className="gamey-features" aria-label="Explore o Conecta">
      <header>
        <span className="gamey-eyebrow">CRIADO PARA A NOSSA COMUNIDADE</span>
        <h2>
          Seu lugar. Suas histórias.
          <br />
          <span>Seu próximo nível.</span>
        </h2>
        <p>
          Da primeira conversa ao último round.
          <br />
          Tem sempre um jeito de estar junto.
        </p>
      </header>
      <div className="gamey-feature-grid">
        <Link to="/perfil-jogos" className="gamey-feature-large">
          <div>
            <span>CONQUISTAS & IDENTIDADE</span>
            <h3>
              Cada partida.
              <br />
              Uma nova conquista.
            </h3>
            <p>
              Desbloqueie medalhas e molduras. Guarde suas capturas e deixe seu perfil com a sua
              cara.
            </p>
            <span className="gamey-feature-link">
              Explorar meu perfil <ArrowUpRight size={14} />
            </span>
          </div>
          <div className="gamey-badge-art" aria-hidden="true">
            <span />
            <Trophy size={79} />
            <i />
            <i />
          </div>
        </Link>
        <Link to="/comunidade" className="gamey-feature-voice">
          <Headphones size={30} />
          <h3>
            A conversa
            <br />
            continua ao vivo.
          </h3>
          <p>Salas de voz e tela compartilhada para estudar, criar e se encontrar.</p>
          <span className="gamey-feature-link">
            Encontrar a turma <ArrowUpRight size={14} />
          </span>
          <div className="gamey-wave" aria-hidden="true">
            {Array.from({ length: 30 }, (_, i) => (
              <i key={i} style={{ height: `${Math.round(12 + Math.sin(i * 0.9) ** 2 * 48)}px` }} />
            ))}
          </div>
        </Link>
        <Link to="/social" className="gamey-feature-social">
          <MessageCircle size={30} />
          <h3>
            Tem coisa que
            <br />
            merece ficar.
          </h3>
          <p>Ideias, projetos e clipes. Compartilhe o que está acontecendo no seu mundo.</p>
          <span className="gamey-feature-link">
            Abrir o Social <ArrowUpRight size={14} />
          </span>
        </Link>
      </div>
    </section>
  );
}
export function GameyFinale() {
  return (
    <section className="gamey-finale">
      <div className="gamey-globe" aria-hidden="true" />
      <div>
        <span className="gamey-eyebrow">TEM UM LUGAR ESPERANDO POR VOCÊ</span>
        <h2>
          O próximo momento
          <br />
          começa com um oi.
        </h2>
        <Link to="/comunidade" className="btn-red">
          <Users size={16} /> Encontrar a turma <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
}
