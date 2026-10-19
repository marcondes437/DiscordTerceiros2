import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/community-auth";
import { BrandLogo } from "@/components/brand-logo";
import { OrbitScene } from "@/components/landing/orbit-scene";
import { Hash, Headphones, Gamepad2, MessageCircle, ShieldCheck } from "lucide-react";

export function AccountGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let live = true;
    let changed = false;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      changed = true;
      if (live) {
        setAuthenticated(Boolean(session));
        setChecking(false);
      }
    });
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (live && !changed) {
          setAuthenticated(Boolean(data.user));
          setChecking(false);
        }
      })
      .catch(() => {
        if (live && !changed) setChecking(false);
      });
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (authenticated) return children;
  return (
    <main className="account-page">
      <OrbitScene />
      <header className="account-header">
        <BrandLogo />
        <span>O espaço da nossa turma</span>
      </header>
      <div className="account-layout">
        <section className="account-story" aria-label="Terceiro A e Terceiro B">
          <div className="community-login-mark" aria-hidden="true">
            conecta<span>FORA DA ÓRBITA / SOROCABA</span>
          </div>
          <span className="account-eyebrow">
            <span /> TERCEIRO A + TERCEIRO B
          </span>
          <h2>
            O sinal
            <br />
            <span>é nosso.</span>
          </h2>
          <p>Entre na conversa, encontre seus amigos e faça parte dos momentos que ficam.</p>
          <div className="account-channels" aria-label="O que você encontra na comunidade">
            <div>
              <span className="account-channel-icon">
                <Hash size={20} />
              </span>
              <span>
                <strong>Um canal para cada conversa</strong>
                <small>Ideias, projetos e o dia a dia da turma.</small>
              </span>
            </div>
            <div>
              <span className="account-channel-icon">
                <Headphones size={20} />
              </span>
              <span>
                <strong>Mais perto, mesmo de longe</strong>
                <small>Salas de voz e compartilhamento de tela.</small>
              </span>
            </div>
            <div>
              <span className="account-channel-icon">
                <Gamepad2 size={20} />
              </span>
              <span>
                <strong>O intervalo também é aqui</strong>
                <small>Jogos e momentos para curtir juntos.</small>
              </span>
            </div>
          </div>
          <div className="account-community">
            <span>
              <MessageCircle size={16} />
            </span>
            <p>
              Dois terceiros. <strong>Uma comunidade.</strong>
            </p>
          </div>
        </section>
        <section className="account-card" aria-label="Acesso à comunidade">
          {checking ? (
            <p role="status">Preparando sua conexão…</p>
          ) : (
            <AuthForm onSuccess={() => setAuthenticated(true)} />
          )}
          <p className="account-private">
            <ShieldCheck size={14} /> Um espaço para os estudantes da comunidade.
          </p>
        </section>
      </div>
      <footer className="account-footer">
        TERCEIRO A & TERCEIRO B <span>O último ano é só o começo.</span>
      </footer>
    </main>
  );
}
