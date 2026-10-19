import { LiveHome } from "@/components/landing/live-home";
import { NotificationBell } from "@/components/notifications";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Compass,
  Feather,
  House,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Volume2,
  X,
  Gamepad2,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CommunityAuth } from "@/components/community-auth";
import { BrandLogo } from "@/components/brand-logo";
import { initials } from "@/components/voice-room";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SENAI Conecta | Nosso último ano. Nosso espaço." },
      {
        name: "description",
        content: "Jogos, comunidade e momentos que ficam. O espaço do Terceiro A e do Terceiro B.",
      },
      { property: "og:title", content: "SENAI Conecta" },
      { property: "og:description", content: "Nosso último ano. Nosso espaço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

/** Revela [data-reveal] ao entrar na tela e aplica parallax em [data-parallax]. */
function useScrollEffects(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = el.querySelectorAll<HTMLElement>("[data-reveal]");
    const scroller = el.querySelector<HTMLElement>("[data-scroller]");
    if (reduced) {
      targets.forEach((t) => t.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { root: scroller, rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    targets.forEach((t) => io.observe(t));

    const layers = el.querySelectorAll<HTMLElement>("[data-parallax]");
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = scroller ? scroller.scrollTop : window.scrollY;
        layers.forEach((l) => {
          const k = Number(l.dataset["parallax"] || 0.1);
          l.style.transform = `translate3d(0, ${y * k}px, 0) scale(1.08)`;
        });
      });
    };
    onScroll();
    const target: HTMLElement | Window = scroller ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      target.removeEventListener("scroll", onScroll);
    };
  }, [root]);
}

function Landing() {
  const shell = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  useScrollEffects(shell);

  const name = String(
    user?.user_metadata?.["display_name"] ||
      user?.user_metadata?.["full_name"] ||
      user?.email?.split("@")[0] ||
      "Visitante",
  );

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  const closeMenu = () => setMenu(false);

  return (
    <div className="glass-page">
      <div className="window glass landing-window home-dashboard" ref={shell}>
        <header className="win-header">
          <button
            type="button"
            className="win-menu"
            aria-label="Abrir menu"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
          <Link to="/" className="win-logo" aria-label="SENAI Conecta, início">
            <BrandLogo />
          </Link>
          <nav className="gamey-header-nav" aria-label="Navegar pelo Conecta">
            <Link to="/jogos">Jogos</Link>
            <Link to="/comunidade">Comunidade</Link>
            <Link to="/social">Social</Link>
          </nav>
          <div className="win-header-end">
            <NotificationBell />
            {user ? (
              <div className="user-chip">
                <span className="user-avatar">
                  {initials(name)}
                  <span className="dot-online" />
                </span>
                <span className="user-meta">
                  <strong className="truncate">{name}</strong>
                  <small>Online</small>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  title="Sair da conta"
                  onClick={() => void supabase.auth.signOut()}
                >
                  <LogOut />
                </button>
              </div>
            ) : (
              <button type="button" className="btn-red btn-sm" onClick={() => setAuthOpen(true)}>
                <LogIn />
                Entrar
              </button>
            )}
          </div>
        </header>

        <div className="win-body">
          <aside className={`win-side ${menu ? "is-open" : ""}`} aria-label="Navegação">
            <button
              type="button"
              className="win-side-close icon-btn"
              aria-label="Fechar menu"
              onClick={closeMenu}
            >
              <X />
            </button>
            <nav className="side-nav">
              <Link to="/" className="side-link is-active" onClick={closeMenu}>
                <House />
                Início
              </Link>
              <Link to="/social" className="side-link" onClick={closeMenu}>
                <Feather aria-hidden="true" />
                <span>Social</span>
              </Link>
              <Link to="/jogos" className="side-link" onClick={closeMenu}>
                <Gamepad2 />
                Jogos
              </Link>
              <Link to="/comunidade" className="side-link" onClick={closeMenu}>
                <MessageSquare />
                Comunidade
              </Link>
              <Link to="/perfil-jogos" className="side-link" onClick={closeMenu}><UserRound/>Perfil de jogos</Link>
              <a href="#salas" className="side-link" onClick={closeMenu}>
                <Volume2 />
                Salas de voz
              </a>
              <a href="#rivalidade" className="side-link" onClick={closeMenu}>
                <Compass />
                Rivalidade
              </a>
            </nav>
            <div className="side-sep" />
            <p className="side-label">Suas turmas</p>
            <Link to="/turmas" search={{ turma: "a" }} className="side-class" onClick={closeMenu}>
              <span className="class-dot is-a" />
              Terceiro A
            </Link>
            <Link to="/turmas" search={{ turma: "b" }} className="side-class" onClick={closeMenu}>
              <span className="class-dot is-b" />
              Terceiro B
            </Link>
            <p className="side-foot">Comunidade independente, sem vínculo oficial com o SENAI.</p>
          </aside>
          {menu && <div className="win-scrim" onClick={closeMenu} />}

          <main className="win-main live-main" data-scroller>
            <LiveHome />
            <section className="home-classes" id="rivalidade" aria-label="Conheça as turmas">
              <div>
                <span className="side-label">NOSSA COMUNIDADE</span>
                <h2>Duas turmas, o mesmo lugar.</h2>
                <p>Cada turma com sua história. Todo mundo conectado.</p>
              </div>
              <Link to="/turmas" search={{ turma: "a" }}>
                <span>A</span>
                <div>
                  <strong>Terceiro A</strong>
                  <small>Conheça a nossa história</small>
                </div>
                <Compass size={18} />
              </Link>
              <Link to="/turmas" search={{ turma: "b" }}>
                <span>B</span>
                <div>
                  <strong>Terceiro B</strong>
                  <small>Conheça a nossa história</small>
                </div>
                <Compass size={18} />
              </Link>
            </section>
          </main>
        </div>
      </div>
      <CommunityAuth open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
