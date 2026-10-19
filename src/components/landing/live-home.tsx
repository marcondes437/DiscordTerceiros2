import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Gamepad2, MessageCircle, Radio, Users, Volume2 } from "lucide-react";
import {
  useActivityPresence,
  mergeActivity,
  type ActivityMember,
} from "@/components/activity-presence";
import { useCommunityProfiles } from "@/hooks/use-community-profiles";
import { useChannelNames } from "@/hooks/use-channel-names";
import { supabase } from "@/integrations/supabase/client";
import { games } from "@/data/games";
import { ProfilePhoto } from "@/components/profile-photo";
import bannerImage from "@/assets/community-lab.jpg";
import "@/routes/home.css";
type Post = { id: string; author_id: string; body: string; created_at: string };
const defaults: Record<string, string> = {
  "conexao-livre": "Conexão livre",
  "grupo-de-estudos": "Grupo de estudos",
  "laboratorio-de-ideias": "Laboratório de ideias",
};
export function LiveHome() {
  const { user, online, classOnline, connected, stopGame } = useActivityPresence();
  const { profiles } = useCommunityProfiles(user?.id);
  const { channelName, isChannelDeleted } = useChannelNames(user?.id);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const members = mergeActivity([...online, ...classOnline]);
  const calls = members.filter((m) => m.room && !isChannelDeleted(m.room, "voice"));
  const roomIds = [...new Set(calls.map((m) => m.room!))];
  const players = members.filter((m) => m.game);
  const myGame = players.find((m) => m.id === user?.id)?.game;
  const displayName = (id: string, fallback = "Membro") => profiles[id]?.display_name || fallback;
  const roomName = (id: string) =>
    channelName(id, "voice", defaults[id.split(":").at(-1)!] || "Sala de voz");
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let live = true;
    const load = async () => {
      const result = await (supabase as any)
        .from("social_posts")
        .select("id,author_id,body,created_at")
        .is("parent_id", null)
        .is("repost_of", null)
        .order("created_at", { ascending: false })
        .limit(5);
      if (!live) return;
      setError(!!result.error);
      if (!result.error) setPosts(result.data || []);
      setLoading(false);
    };
    void load();
    const refresh = () => {
      if (!document.hidden) void load();
    };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [user?.id]);
  function Avatar({ id, name }: { id: string; name: string }) {
    return (
      <span className="live-avatar">
        {profiles[id]?.avatarSrc ? (
          <ProfilePhoto src={profiles[id].avatarSrc!} alt={name} />
        ) : (
          name.slice(0, 1).toUpperCase()
        )}
        {members.some((m) => m.id === id) && <i />}
      </span>
    );
  }
  function Person({ member }: { member: ActivityMember }) {
    const game = games.find((g) => g.id === member.game);
    return (
      <Link to="/comunidade" className="live-person">
        <Avatar id={member.id} name={displayName(member.id, member.name)} />
        <span>
          <strong>
            {displayName(member.id, member.name)}
            {member.id === user?.id && <em> você</em>}
          </strong>
          <small>
            {member.room
              ? "Em voz · " + roomName(member.room)
              : game
                ? "Abriu " + game.name
                : "Online no Conecta"}
          </small>
        </span>
        {member.room ? <Volume2 size={16} /> : game ? <Gamepad2 size={16} /> : null}
      </Link>
    );
  }
  return (
    <div className="live-home">
      <div className="live-center">
        <header className="live-top">
          <span>
            <i /> A TURMA EM TEMPO REAL
          </span>
          <small>{new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}</small>
        </header>
        <section className="live-hero">
          <img src={bannerImage} alt="Alunos no laboratório do SENAI" />
          <div className="live-hero-shade" />
          <div className="live-hero-copy">
            <span className="home-featured-label">
              <Radio size={13} /> SUA COMUNIDADE. SEU PRÓXIMO MOMENTO.
            </span>
            <h1>
              A aula acaba.
              <br />A conexão <span>continua.</span>
            </h1>
            <p>
              Entre na call, descubra um jogo ou acompanhe o que está rolando. O ponto de encontro
              da sua turma é aqui.
            </p>
            <div className="home-featured-actions">
              <Link to="/comunidade" className="btn-red">
                <Volume2 size={17} /> Entrar na comunidade <ArrowUpRight size={17} />
              </Link>
              <Link to="/jogos" className="home-secondary-action">
                <Gamepad2 size={17} /> Explorar jogos
              </Link>
            </div>
          </div>
          <div className="live-hero-label">
            <Radio size={14} /> A conexão continua por aqui.
          </div>
        </section>
        <nav className="home-destinations" aria-label="Explore o Conecta">
          <Link to="/comunidade">
            <span>
              <MessageCircle size={22} />
            </span>
            <div>
              <strong>A conversa está aqui</strong>
              <small>Canais, ideias e salas de voz</small>
            </div>
            <ArrowUpRight size={17} />
          </Link>
          <Link to="/social">
            <span>
              <Users size={22} />
            </span>
            <div>
              <strong>O que a turma conta</strong>
              <small>Publicações e novidades</small>
            </div>
            <ArrowUpRight size={17} />
          </Link>
          <Link to="/jogos">
            <span>
              <Gamepad2 size={22} />
            </span>
            <div>
              <strong>Seu próximo intervalo</strong>
              <small>Descubra os jogos da turma</small>
            </div>
            <ArrowUpRight size={17} />
          </Link>
        </nav>
        <div className="live-stats">
          <a href="#live-online">
            <Users />
            <strong>{connected ? members.length : "—"}</strong>
            <span>online agora</span>
          </a>
          <a href="#salas">
            <Volume2 />
            <strong>{calls.length}</strong>
            <span>em chamada</span>
          </a>
          <a href="#live-games">
            <Gamepad2 />
            <strong>{players.length}</strong>
            <span>com jogo aberto</span>
          </a>
        </div>
        <section className="live-section" id="salas">
          <div className="live-heading">
            <div>
              <span>JUNTE-SE À CONVERSA</span>
              <h2>
                <Volume2 size={21} /> A turma está em voz
              </h2>
            </div>
            <Link to="/comunidade">
              Ver salas <ArrowUpRight size={15} />
            </Link>
          </div>
          {roomIds.length ? (
            <div className="live-call-grid">
              {roomIds.map((id) => (
                <article className="live-call" key={id}>
                  <span className="live-tag">
                    <i /> EM CHAMADA {id.includes(":") ? "· SUA TURMA" : ""}
                  </span>
                  <h3>{roomName(id)}</h3>
                  <div>
                    {calls
                      .filter((m) => m.room === id)
                      .map((m) => (
                        <Person key={m.id} member={m} />
                      ))}
                  </div>
                  <Link to="/comunidade">
                    Abrir comunidade <ArrowUpRight size={15} />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="live-empty">
              <Volume2 />
              <div>
                <strong>A primeira conversa pode ser sua.</strong>
                <p>Nenhuma chamada ativa por enquanto. Chame a turma para uma sala.</p>
              </div>
              <Link to="/comunidade">Ver salas</Link>
            </div>
          )}
        </section>
        <section className="live-section" id="live-games">
          <div className="live-heading">
            <div>
              <span>UM INTERVALO COM A TURMA</span>
              <h2>
                <Gamepad2 size={22} /> Quem está jogando
              </h2>
            </div>
            <Link to="/jogos">
              Explorar jogos <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="live-game-grid">
            {games.map((game) => {
              const group = players.filter((m) => m.game === game.id);
              return (
                <article className="live-game" key={game.id}>
                  <Link to="/jogos" className="live-game-cover">
                    <img src={game.image} alt={game.name} />
                    <span>
                      {group.length
                        ? group.length + " com o jogo aberto"
                        : game.url
                          ? "Chame a turma"
                          : "Em breve"}
                    </span>
                  </Link>
                  <div className="live-game-info">
                    <h3>{game.name}</h3>
                    <p>
                      {group.length
                        ? "A turma abriu este jogo pelo Conecta."
                        : "Ainda não tem ninguém por aqui."}
                    </p>
                    {group.map((m) => (
                      <Person key={m.id} member={m} />
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
          <p className="live-note">
            O status indica um jogo aberto pelo Conecta e expira em 30 minutos.{" "}
            {myGame && <button onClick={stopGame}>Encerrar meu status de jogo</button>}
          </p>
        </section>
        <section className="live-section">
          <div className="live-heading">
            <div>
              <span>IDEIAS QUE MOVIMENTAM A TURMA</span>
              <h2>
                <MessageCircle size={21} /> Acabou de sair no Social
              </h2>
            </div>
            <Link to="/social">
              Abrir Social <ArrowUpRight size={15} />
            </Link>
          </div>
          {loading ? (
            <p className="live-empty" role="status">
              Carregando publicações…
            </p>
          ) : error ? (
            <p className="live-empty" role="alert">
              Não foi possível atualizar o Social. Tentaremos novamente em instantes.
            </p>
          ) : posts.length ? (
            <div className="live-posts">
              {posts.map((post) => (
                <Link to="/social" className="live-post" key={post.id}>
                  <Avatar id={post.author_id} name={displayName(post.author_id)} />
                  <div>
                    <header>
                      <strong>{displayName(post.author_id)}</strong>
                      <time dateTime={post.created_at}>
                        {new Date(post.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </header>
                    <p>{post.body}</p>
                    <span>
                      Ver no Social <ArrowUpRight size={13} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="live-empty">
              <MessageCircle />
              <div>
                <strong>A aula rende histórias.</strong>
                <p>Compartilhe uma ideia, um projeto ou o momento de hoje.</p>
              </div>
              <Link to="/social">Publicar no Social</Link>
            </div>
          )}
        </section>
        <footer className="live-footer">
          Duas turmas. Uma só conexão. <span>SENAI CONECTA</span>
        </footer>
      </div>
      <aside className="live-online" id="live-online">
        <div className="live-online-title">
          <h2>
            <i /> Online agora
          </h2>
          <span>{connected ? members.length : "—"}</span>
        </div>
        <p>A turma está por aqui.</p>
        <input
          aria-label="Buscar pessoa online"
          placeholder="Encontrar alguém…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="live-online-list">
          {!connected ? (
            <p role="status">Conectando à comunidade…</p>
          ) : (
            members
              .filter((m) =>
                displayName(m.id, m.name).toLocaleLowerCase().includes(query.toLocaleLowerCase()),
              )
              .map((m) => <Person key={m.id} member={m} />)
          )}
          {connected && !members.length && <p>Ninguém online neste momento.</p>}
        </div>
        <div className="live-sidebar-note">
          <Radio size={20} />
          <strong>Presença de verdade.</strong>
          <p>Quem está no site aparece aqui. As chamadas e os jogos acompanham o ritmo da turma.</p>
        </div>
      </aside>
    </div>
  );
}
