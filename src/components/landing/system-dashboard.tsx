import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Gamepad2, MessageCircle, Users, Volume2 } from "lucide-react";
import { ProfilePhoto } from "@/components/profile-photo";
import { games } from "@/data/games";

export function SystemDashboard({
  name,
  avatar,
  connected,
  calls,
  players,
}: {
  name: string;
  avatar?: string | null;
  connected: boolean;
  calls: number;
  players: number;
}) {
  const areas = [
    {
      to: "/comunidade",
      title: "Conexão",
      description: "Conversas, ideias e salas para reunir a turma.",
      status: `${calls} em voz`,
      image: "/art/crimson-world.svg",
      icon: Volume2,
    },
    {
      to: "/jogos",
      title: "Arena",
      description: "Rabisco e SlitherSenai. Chame a turma para jogar.",
      status: `${players} com jogo aberto`,
      image: games[0].heroImage || games[0].image,
      icon: Gamepad2,
    },
    {
      to: "/social",
      title: "Memórias",
      description: "Compartilhe suas ideias e os melhores momentos.",
      status: "Abrir o Social",
      image: "/art/crimson-world.svg",
      icon: MessageCircle,
    },
    {
      to: "/perfil-jogos",
      title: "Sua jornada",
      description: "Conquistas, capturas e uma identidade só sua.",
      status: "Ver meu perfil",
      image: games[1].heroImage || games[1].image,
      icon: Users,
    },
  ] as const;
  return (
    <>
      <div className="system-cover">
        <img src="/art/crimson-world.svg" alt="" />
        <span>SOROCABA / TERCEIRO A + B</span>
      </div>
      <header className="system-title">
        <span className="system-emblem" aria-hidden="true">
          <Gamepad2 size={28} />
        </span>
        <div>
          <span>SEU PRÓXIMO CAPÍTULO COMEÇA AQUI</span>
          <h1>Conecta — Community OS.</h1>
          <p>Sua turma, suas partidas e os momentos que ficam.</p>
        </div>
        <Link to="/comunidade" className="btn-red">
          Entrar na comunidade <ArrowUpRight size={15} />
        </Link>
      </header>
      <section className="system-dashboard" aria-label="Seu painel da comunidade">
        <div className="system-player-column">
          <h2 className="system-label">Jogador</h2>
          <article className="system-player">
            <Link to="/perfil-jogos" className="system-player-art">
              <span className="system-player-avatar">
                {avatar ? <ProfilePhoto src={avatar} alt={name} /> : name.slice(0, 1).toUpperCase()}
              </span>
              <span>SEU PERSONAGEM</span>
            </Link>
            <div className="system-player-info">
              <strong>{name}</strong>
              <span className="system-status">
                <i /> {connected ? "SISTEMA ONLINE" : "CONECTANDO"}
              </span>
              <p>Suas conquistas, molduras e capturas estão no seu perfil.</p>
              <Link to="/perfil-jogos">
                Abrir meu perfil <ArrowUpRight size={13} />
              </Link>
            </div>
          </article>
        </div>
        <div className="system-areas-column">
          <h2 className="system-label">Seu universo</h2>
          <div className="system-areas">
            {areas.map(({ to, title, description, status, image, icon: Icon }, i) => (
              <Link key={to} to={to} className={`system-area system-area-${i}`}>
                <img src={image} alt="" />
                <div>
                  <strong>
                    <Icon size={13} /> {title}
                  </strong>
                  <p>{description}</p>
                  <span>
                    {status}
                    <ArrowUpRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <nav className="system-shortcuts" aria-label="Atalhos do painel">
            <Link to="/comunidade">
              <Volume2 size={13} /> Salas de voz
            </Link>
            <Link to="/jogos">
              <Gamepad2 size={13} /> Jogos
            </Link>
            <Link to="/social">
              <MessageCircle size={13} /> Social
            </Link>
            <Link to="/perfil-jogos">
              <Users size={13} /> Conquistas e capturas
            </Link>
          </nav>
        </div>
      </section>
    </>
  );
}
