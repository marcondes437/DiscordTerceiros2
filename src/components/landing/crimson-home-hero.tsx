import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { games } from '@/data/games';
import { ArrowUpRight, Gamepad2, Hash, Headphones, Users } from "lucide-react";
const featuredGames = [
  { id: "rabisco", name: "Rabisco", image: "/games/rabisco-hero.svg" },
  { id: "slithersenai", name: "SlitherSenai", image: "/games/slithersenai-hero.svg" },
] as const;
export function CrimsonHomeHero({ online, connected }: { online: number; connected: boolean }) {
  const [selected, setSelected] = useState(0);
  const game = featuredGames[selected]!;
  return (
    <section className="crimson-dashboard" aria-label="Seu próximo encontro">
      <nav className="crimson-rail" aria-label="Atalhos da home">
        <Link to="/" aria-label="Início" className="crimson-home-mark">
          C
        </Link>
        <Link to="/comunidade" aria-label="Canais da comunidade">
          <Hash size={19} />
        </Link>
        <Link to="/jogos" aria-label="Jogos da turma">
          <Gamepad2 size={19} />
        </Link>
        <a href="#salas" aria-label="Salas de voz">
          <Headphones size={19} />
        </a>
        <Link to="/social" aria-label="Social da turma">
          <Users size={19} />
        </Link>
      </nav>
      <div className="crimson-dashboard-main">
        <header className="crimson-dashboard-header">
          <h1>Seu próximo encontro.</h1>
          <span>
            <i />
            {connected ? `${online} online agora` : "Conectando à turma…"}
          </span>
        </header>
        <div className="crimson-home-banner">
          <div className="crimson-home-glow" aria-hidden="true" />
          <div className="crimson-banner-copy">
            <span>JOGUE COM A TURMA</span>
            <h2>
              Mais uma partida?
              <br />
              Só se for junto.
            </h2>
            <p>Rabisco & SlitherSenai. O intervalo ganhou um lugar.</p>
            <a href={games.find(item=>item.id===game.id)?.url || `/jogar?game=${game.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Jogar ${game.name}`}>
              Jogar {game.name}
              <ArrowUpRight size={17} />
            </a>
            <div className="crimson-game-tabs" aria-label="Escolher jogo">
              {featuredGames.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <img className="crimson-banner-art" src={game.image} alt="" key={game.id} />
          <span className="crimson-banner-stamp" aria-hidden="true">
            JUNTOS
            <br />É MELHOR.
          </span>
        </div>
        <div className="crimson-home-actions">
          <Link to="/comunidade">
            <Headphones size={25} />
            <ArrowUpRight className="crimson-card-arrow" size={17} />
            <strong>Converse de perto</strong>
            <span>Salas de voz e comunidade</span>
          </Link>
          <Link to="/jogos">
            <Gamepad2 size={25} />
            <ArrowUpRight className="crimson-card-arrow" size={17} />
            <strong>Entre no jogo</strong>
            <span>Salas, convites e conquistas</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
