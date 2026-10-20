import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Gamepad2,
  Heart,
  Images,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { SocialSiteShell } from "@/components/social-site-shell";
import { CommunityAuth } from "@/components/community-auth";
import { CommunityProfileEditor } from "@/components/community-profile-editor";
import { ProfilePhoto } from "@/components/profile-photo";
import { useActivityPresence } from "@/components/activity-presence";
import { useGamingAccount } from "@/hooks/use-gaming-account";
import { games } from "@/data/games";
import { GamingGallery, GamingAchievements } from "@/components/gaming-media";
import { useGameCosmetics } from "@/hooks/use-game-cosmetics";
import "./perfil-jogos.css";

export const Route = createFileRoute("/perfil-jogos")({
  head: () => ({ meta: [{ title: "Meu perfil de jogos | SENAI Conecta" }] }),
  component: GamingProfile,
});
const tabs = [
  { id: "info", label: "Informações" },
  { id: "activity", label: "Atividade" },
  { id: "achievements", label: "Conquistas" },
  { id: "captures", label: "Capturas" },
] as const;
type Tab = (typeof tabs)[number]["id"];

export function GamingProfile() {
  const { user, profile, name, favorites, toggleFavorite, busy, error, refreshProfile } =
    useGamingAccount();
  const { online, classOnline, connected } = useActivityPresence();
  const cosmetics = useGameCosmetics(user?.id);
  const [authOpen, setAuthOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>("info");
  const favoriteGames = games.filter((game) => favorites.includes(game.id));
  const current = [...online, ...classOnline].find(
    (member) => member.id === user?.id && member.game,
  );
  const currentGame = games.find((game) => game.id === current?.game);
  const isOnline = !!user && connected;
  const since = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null;
  const edit = () => (user ? setEditing(true) : setAuthOpen(true));

  return (
    <SocialSiteShell
      user={user}
      name={name}
      activePage="gaming-profile"
      onSignIn={() => setAuthOpen(true)}
    >
      {editing && user ? (
        <CommunityProfileEditor
          user={user}
          {...(profile ? { profile } : {})}
          onClose={() => setEditing(false)}
          onSaved={refreshProfile}
        />
      ) : (
        <div
          className="console-profile"
          style={{ "--profile-cover": profile?.banner_color || "#3e2c32" } as CSSProperties}
        >
          <section className="console-hero" aria-label="Seu perfil de jogos">
            <div className="console-cover" aria-hidden="true">
              {(profile?.bannerSrc || profile?.avatarSrc) && (
                <img src={profile.bannerSrc || profile.avatarSrc} alt="" />
              )}
            </div>
            <header className="console-topbar">
              <Link to="/jogos" aria-label="Voltar aos jogos">
                <ArrowLeft size={18} />
                <Gamepad2 size={26} />
                <span>Perfil de jogos</span>
              </Link>
              <button
                onClick={edit}
                aria-label="Editar perfil"
                title="Editar foto, capa e biografia"
              >
                <Settings size={23} />
              </button>
            </header>
            <div className="console-identity">
              <div className="console-avatar-wrap">
                <button
                  className={`console-avatar ${cosmetics.frame ? "has-earned-frame" : ""}`}
                  style={
                    cosmetics.frame
                      ? {
                          outline: `4px solid ${cosmetics.frame.color}`,
                          outlineOffset: "4px",
                          boxShadow: `0 0 28px ${cosmetics.frame.color}40`,
                        }
                      : undefined
                  }
                  onClick={edit}
                  aria-label="Alterar foto de perfil"
                >
                  {profile?.avatarSrc ? (
                    <ProfilePhoto src={profile.avatarSrc} alt={`Foto de ${name}`} />
                  ) : (
                    <span>{name.slice(0, 1).toUpperCase()}</span>
                  )}
                </button>
                <span
                  className={`console-presence ${isOnline ? "is-online" : ""}`}
                  role="img"
                  aria-label={isOnline ? "Online" : "Sem conexão de presença"}
                />
              </div>
              <div className="console-person">
                <h1>{name}</h1>
                {cosmetics.title && (
                  <span className="gaming-earned-title" style={{ color: cosmetics.title.color }}>
                    {cosmetics.title.title}
                  </span>
                )}
                <p className="console-tagline">
                  {profile?.bio || "Seu próximo jogo. Sua próxima história."}
                </p>
                <button className="console-edit" onClick={edit}>
                  <Settings size={16} />
                  Personalizar perfil
                </button>
                <dl className="console-numbers">
                  <div>
                    <dt>Favoritos</dt>
                    <dd>{favorites.length}</dd>
                  </div>
                  <div>
                    <dt>Na comunidade</dt>
                    <dd>
                      {games.length} <Gamepad2 size={14} />
                    </dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd className={isOnline ? "console-online-text" : ""}>
                      {currentGame ? "Jogando" : isOnline ? "Online" : "Indisponível"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="console-library-bar">
              <div>
                <Gamepad2 size={25} />
                <span>
                  <small>Sua biblioteca</small>
                  <strong>
                    {favoriteGames.length}{" "}
                    {favoriteGames.length === 1 ? "jogo favorito" : "jogos favoritos"}
                  </strong>
                </span>
              </div>
              <Link to="/jogos">
                Explorar jogos <ArrowUpRight size={17} />
              </Link>
            </div>
          </section>
          <div className="console-tabs" role="tablist" aria-label="Seções do perfil">
            {tabs.map((item, index) => (
              <button
                key={item.id}
                id={`profile-tab-${item.id}`}
                role="tab"
                aria-selected={tab === item.id}
                aria-controls="profile-panel"
                tabIndex={tab === item.id ? 0 : -1}
                onClick={() => setTab(item.id)}
                onKeyDown={(event) => {
                  let next = index;
                  if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
                  else if (event.key === "ArrowLeft")
                    next = (index + tabs.length - 1) % tabs.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = tabs.length - 1;
                  else return;
                  event.preventDefault();
                  setTab(tabs[next]!.id);
                  document.getElementById(`profile-tab-${tabs[next]!.id}`)?.focus();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            className="console-content"
            id="profile-panel"
            role="tabpanel"
            aria-labelledby={`profile-tab-${tab}`}
          >
            {error && (
              <p className="console-error" role="alert">
                {error}
              </p>
            )}
            {(tab === "info" || tab === "activity") && (
              <>
                <section className="console-section">
                  <div className="console-section-heading">
                    <h2>Atividade atual</h2>
                    <Link to="/jogos">
                      Ver jogos <ArrowUpRight size={14} />
                    </Link>
                  </div>
                  {currentGame ? (
                    <div className="console-now">
                      <img src={currentGame.image} alt="" />
                      <div>
                        <span>
                          <i /> JOGO ABERTO
                        </span>
                        <h3>{currentGame.name}</h3>
                        <p>Aberto pelo Conecta. Reúna a turma para jogar.</p>
                      </div>
                      <Link to="/jogos">
                        Abrir catálogo <ArrowUpRight size={16} />
                      </Link>
                    </div>
                  ) : (
                    <div className="console-activity-empty">
                      <Gamepad2 size={24} />
                      <div>
                        <strong>Nenhum jogo aberto agora</strong>
                        <p>Escolha um jogo no catálogo e encontre a turma.</p>
                      </div>
                      <Link to="/jogos">Explorar</Link>
                    </div>
                  )}
                </section>
                <section className="console-section">
                  <div className="console-section-heading">
                    <h2>{favoriteGames.length ? "Seus favoritos" : "Descubra seu próximo jogo"}</h2>
                    <span>{favoriteGames.length || games.length} jogos</span>
                  </div>
                  <div className="console-games">
                    {(favoriteGames.length ? favoriteGames : games).map((game) => (
                      <article className="console-game" key={game.id}>
                        <Link to="/jogos" className="console-game-cover">
                          <img src={game.image} alt={`Capa de ${game.name}`} />
                        </Link>
                        <div className="console-game-info">
                          <Link to="/jogos">
                            <h3>{game.name}</h3>
                          </Link>
                          <p>{game.categories.join(" · ")}</p>
                          <span className={game.url ? "is-available" : ""}>
                            {game.url ? "Disponível para jogar" : game.unavailableReason ? "Indisponível" : "Em breve"}
                          </span>
                          <button
                            disabled={busy || !user}
                            onClick={() => void toggleFavorite(game.id)}
                            aria-pressed={favorites.includes(game.id)}
                            aria-label={`${favorites.includes(game.id) ? "Remover" : "Adicionar"} ${game.name} ${favorites.includes(game.id) ? "dos" : "aos"} favoritos`}
                          >
                            <Heart
                              size={14}
                              fill={favorites.includes(game.id) ? "currentColor" : "none"}
                            />
                            {favorites.includes(game.id) ? "Favorito" : "Favoritar"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}
            {tab === "info" && (
              <section className="console-section">
                <div className="console-section-heading">
                  <h2>Seu universo de jogos</h2>
                </div>
                <div className="console-stat-grid">
                  <div>
                    <span>Biblioteca favorita</span>
                    <strong>
                      <Heart size={23} />
                      {favorites.length}
                      <small>jogos</small>
                    </strong>
                  </div>
                  <div>
                    <span>Jogos da comunidade</span>
                    <strong>
                      <Users size={23} />
                      {games.length}
                      <small>no catálogo</small>
                    </strong>
                  </div>
                  <div>
                    <span>Disponíveis agora</span>
                    <strong>
                      <CheckCircle2 size={23} />
                      {games.filter((game) => game.url).length}
                      <small>para jogar</small>
                    </strong>
                  </div>
                  <div>
                    <span>Seu espaço</span>
                    <strong>
                      <ShieldCheck size={23} />
                      <small>SENAI Conecta</small>
                    </strong>
                  </div>
                </div>
              </section>
            )}
            {tab === "achievements" && (
              <section className="console-section">
                <div className="console-section-heading">
                  <h2>Conquistas</h2>
                </div>
                {user && <GamingAchievements userId={user.id} onEquip={cosmetics.refresh} />}
              </section>
            )}
            {(tab === "info" || tab === "captures") && (
              <section className="console-section">
                <div className="console-section-heading">
                  <h2>Capturas</h2>
                </div>
                {user && <GamingGallery userId={user.id} />}
              </section>
            )}
            {tab === "info" && (
              <section className="console-section console-biography">
                <div className="console-section-heading">
                  <h2>Biografia</h2>
                  <button onClick={edit}>Editar</button>
                </div>
                <p>
                  {profile?.bio ||
                    "Adicione uma biografia e conte para a turma o que você gosta de jogar."}
                </p>
                <div className="console-membership">
                  <span>
                    <Gamepad2 size={28} />
                  </span>
                  <div>
                    <strong>Membro do SENAI Conecta</strong>
                    <small>
                      {since ? `Desde ${since}` : "Entre para fazer parte da comunidade"}
                    </small>
                  </div>
                  <CalendarDays size={18} />
                </div>
              </section>
            )}
          </div>
        </div>
      )}
      <CommunityAuth open={authOpen} onOpenChange={setAuthOpen} />
    </SocialSiteShell>
  );
}
