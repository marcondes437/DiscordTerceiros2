import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import {
  House,
  Feather,
  MessageCircle,
  Volume2,
  Compass,
  Menu,
  X,
  LogOut,
  Gamepad2,
  UserRound,
} from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { supabase } from "@/integrations/supabase/client";

export function SocialSiteShell({
  children,
  user,
  name,
  onSignIn,
  activePage = "social",
}: {
  children: ReactNode;
  user: User | null;
  name: string;
  onSignIn: () => void;
  activePage?: "social" | "games" | "gaming-profile" | "class-story";
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      className={`glass-page social-site-shell ${activePage !== "social" ? "games-site-shell" : ""}`}
    >
      <div className="window glass">
        <header className="win-header">
          <button className="win-menu" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}>
            <Menu />
          </button>
          <Link to="/" className="win-logo" aria-label="SENAI Conecta, início">
            <BrandLogo />
          </Link>
          <div className="win-header-end">
            {user ? (
              <div className="user-chip">
                <span className="user-avatar">
                  {name.slice(0, 1).toUpperCase()}
                  <span className="dot-online" />
                </span>
                <span className="user-meta">
                  <strong>{name}</strong>
                  <small>Online</small>
                </span>
                <button
                  className="icon-btn"
                  title="Sair da conta"
                  onClick={() => void supabase.auth.signOut()}
                >
                  <LogOut />
                </button>
              </div>
            ) : (
              <button className="btn-red btn-sm" onClick={onSignIn}>
                Entrar
              </button>
            )}
          </div>
        </header>
        <div className="win-body">
          <aside className={`win-side ${menuOpen ? "is-open" : ""}`} aria-label="Navegação">
            <button
              className="win-side-close icon-btn"
              aria-label="Fechar menu"
              onClick={() => setMenuOpen(false)}
            >
              <X />
            </button>
            <nav className="side-nav">
              <Link to="/" className="side-link">
                <House />
                Início
              </Link>
              <Link
                to="/social"
                className={`side-link ${activePage === "social" ? "is-active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <Feather />
                Social
              </Link>
              <Link
                to="/jogos"
                className={`side-link ${activePage === "games" ? "is-active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <Gamepad2 />
                Jogos
              </Link>
              {(activePage === "games" || activePage === "gaming-profile") && (
                <Link
                  to="/perfil-jogos"
                  className={`side-link ${activePage === "gaming-profile" ? "is-active" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <UserRound />
                  Perfil de jogos
                </Link>
              )}
              <Link to="/comunidade" className="side-link">
                <MessageCircle />
                Comunidade
              </Link>
              <a href="/#salas" className="side-link">
                <Volume2 />
                Salas de voz
              </a>
              <a href="/#rivalidade" className="side-link">
                <Compass />
                Rivalidade
              </a>
            </nav>
            <div className="side-sep" />
            <p className="side-label">Suas turmas</p>
            <Link
              to="/turmas"
              search={{ turma: "a" }}
              className="side-class"
              onClick={() => setMenuOpen(false)}
            >
              <span className="class-dot is-a" />
              Terceiro A
            </Link>
            <Link
              to="/turmas"
              search={{ turma: "b" }}
              className="side-class"
              onClick={() => setMenuOpen(false)}
            >
              <span className="class-dot is-b" />
              Terceiro B
            </Link>
            <p className="side-foot">Comunidade independente, sem vínculo oficial com o SENAI.</p>
          </aside>
          {menuOpen && <div className="win-scrim" onClick={() => setMenuOpen(false)} />}
          <div className="win-main social-site-content" data-scroller>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
