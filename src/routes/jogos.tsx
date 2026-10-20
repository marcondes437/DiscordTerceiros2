import { useActivityPresence } from "@/components/activity-presence";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  Gamepad2,
  Globe,
  Play,
  Search,
  Users,
  X,
  UserRound,
} from "lucide-react";
import { SocialSiteShell } from "@/components/social-site-shell";
import { CommunityAuth } from "@/components/community-auth";
import { GameCard } from "@/components/game-card";
import { useGamingAccount } from "@/hooks/use-gaming-account";
import { communityGames, gameCategories, filterGames, offlineCategoryNote } from "@/data/games";
import "./jogos.css";

export const Route = createFileRoute("/jogos")({
  head: () => ({
    meta: [
      { title: "Jogos | SENAI Conecta" },
      {
        name: "description",
        content: "Escolha um jogo, reúna a turma e jogue direto no navegador.",
      },
    ],
  }),
  component: Games,
});

function Games() {
  const { startGame } = useActivityPresence();
  const { user, name, favorites, toggleFavorite, busy, error } = useGamingAccount();
  const [authOpen, setAuthOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const catalog = useRef<HTMLElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const featured = communityGames[featuredIndex]!;
  const visible = filterGames(query, category);
  return (
    <SocialSiteShell user={user} name={name} onSignIn={() => setAuthOpen(true)} activePage="games">
      <div className="games-page">
        <header className="games-toolbar">
          <div>
            <Gamepad2 size={19} />
            <span>Jogos</span>
            <small>Seu próximo intervalo começa aqui.</small>
          </div>
          <div className="games-toolbar-actions">
            <Link to="/perfil-jogos">
              <UserRound size={16} />
              Meu perfil
            </Link>
            <button
              aria-label="Buscar jogos"
              onClick={() => {
                catalog.current?.scrollIntoView({ behavior: "smooth" });
                searchInput.current?.focus({ preventScroll: true });
              }}
            >
              <Search size={20} />
            </button>
          </div>
        </header>
        <section className={`games-hero games-hero-${featured.id}`} aria-label="Jogo em destaque">
          {featured.url ? (
            <a
              className="games-hero-image"
              href={featured.url}
              onClick={() => startGame(featured.id)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Jogar ${featured.name} (nova aba)`}
            >
              <img
                key={featured.id}
                src={featured.heroImage || featured.image}
                alt={`Arte de ${featured.name}`}
              />
            </a>
          ) : (
            <div className="games-hero-image">
              <img
                key={featured.id}
                src={featured.heroImage || featured.image}
                alt={`Arte de ${featured.name}`}
              />
            </div>
          )}
          <div className="games-hero-shade" />
          <div className="games-hero-copy">
            <span className="games-eyebrow">
              <span />
              ESCOLHA. CHAME A TURMA. JOGUE.
            </span>
            <h1>{featured.name}</h1>
            <div className="games-hero-tags">
              <span>
                <Globe size={13} />
                No navegador
              </span>
              <span>
                <Users size={13} />
                Multiplayer
              </span>
            </div>
            <p>{featured.description}</p>
            <div className="games-hero-actions">
              {featured.url ? (
                <a
                  className="games-play-button"
                  href={featured.url}
                  onClick={() => startGame(featured.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Play size={16} fill="currentColor" />
                  Jogar agora
                  <ArrowUpRight size={16} />
                </a>
              ) : (
                <span className="games-play-button is-coming-soon">Em breve</span>
              )}
              <button onClick={() => catalog.current?.scrollIntoView({ behavior: "smooth" })}>
                Explorar jogos
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="games-featured-picker" aria-label="Escolher destaque">
            {communityGames.map((game, i) => (
              <button
                key={game.id}
                className={featuredIndex === i ? "is-active" : ""}
                aria-pressed={featuredIndex === i}
                aria-label={`Destacar ${game.name}`}
                onClick={() => setFeaturedIndex(i)}
              >
                <img src={game.image} alt="" />
                <span>{game.name}</span>
              </button>
            ))}
          </div>
          <span className="games-hero-number">
            0{featuredIndex + 1}
            <i />
            {String(communityGames.length).padStart(2, "0")}
          </span>
        </section>
        <div className="games-studio-strip">
          <div>
            <Gamepad2 size={23} />
            <span>
              <strong>Feitos por nós. Para jogar juntos.</strong>
              <small>Rabisco e SlitherSenai: os jogos da nossa comunidade.</small>
            </span>
          </div>
          <Link to="/perfil-jogos">
            Sua coleção
            <ChevronRight size={16} />
          </Link>
        </div>
        <section className="games-catalog" ref={catalog}>
          <div className="games-section-heading">
            <div>
              <span>ENCONTRE SEU PRÓXIMO JOGO</span>
              <h2>Explore o catálogo</h2>
            </div>
            <label className="games-search">
              <Search size={16} />
              <input
                ref={searchInput}
                aria-label="Buscar no catálogo de jogos"
                placeholder="Buscar um jogo..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button aria-label="Limpar busca" onClick={() => setQuery("")}>
                  <X size={15} />
                </button>
              )}
            </label>
          </div>
          <div className="games-filter-row">
            <div className="games-categories" aria-label="Categorias">
              {gameCategories.map((item) => (
                <button
                  key={item}
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <span>
              {visible.length} {visible.length === 1 ? "jogo" : "jogos"}
            </span>
          </div>
          <p className="games-catalog-note">
            {category === "Offline" ? offlineCategoryNote : "Jogos da comunidade e uma seleção de sites externos. Os links externos abrem em uma nova aba; requisitos e disponibilidade dependem de cada projeto."}
          </p>
          <div className="games-grid">
            {visible.map((game) => (
              <GameCard
                game={game}
                key={game.id}
                favorite={favorites.includes(game.id)}
                onFavorite={() => void toggleFavorite(game.id)}
                busy={busy || !user}
              />
            ))}
          </div>
          {!visible.length && (
            <div className="games-empty">
              <Gamepad2 size={36} />
              <h3>Nenhum jogo encontrado</h3>
              <p>Tente outro nome ou escolha outra categoria.</p>
              <button
                onClick={() => {
                  setQuery("");
                  setCategory("Todos");
                }}
              >
                Mostrar todos os jogos
              </button>
            </div>
          )}
        </section>
        {error && (
          <p className="gaming-profile-error" role="alert">
            {error}
          </p>
        )}
        <footer className="games-footer">
          <span>
            SENAI CONECTA <i /> JOGOS
          </span>
          <p>
            Crie salas para Rabisco e SlitherSenai ou explore os jogos externos. Os sites externos mantêm seus próprios modos de jogo e requisitos.
          </p>
        </footer>
      </div>
      <CommunityAuth open={authOpen} onOpenChange={setAuthOpen} />
    </SocialSiteShell>
  );
}
