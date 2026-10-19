import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/community-auth";
import { BrandLogo } from "@/components/brand-logo";
import { Hash, Headphones, Gamepad2, ArrowUpRight, Users, Sparkles } from "lucide-react";
import "./account-access.css";

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
    <main className="account-page account-access">
      <section className="access-entry" aria-label="Acesso ao Conecta">
        <div className="access-form-wrap">
          <div className="access-logo"><BrandLogo /></div>
          {checking ? <p className="access-loading" role="status">Preparando sua conexão…</p> : <AuthForm appearance="minimal" onSuccess={() => setAuthenticated(true)} />}
        </div>
        <footer className="access-footer">Um espaço para os estudantes.<br /><span>Terceiro A + Terceiro B · SENAI Conecta</span></footer>
      </section>
      <aside className="access-showcase" aria-label="Conheça o Conecta">
        <div className="access-orbit" aria-hidden="true" />
        <div className="access-preview" aria-hidden="true">
          <div className="access-floating-label"><Sparkles size={15} /> Grandes momentos começam juntos.</div>
          <div className="access-demo">
            <div className="access-demo-rail"><span>C</span><Hash /><Gamepad2 /><Headphones /><Users /></div>
            <div className="access-demo-body">
              <div className="access-demo-top"><strong>Seu próximo encontro.</strong><span>PRÉVIA DO CONECTA</span></div>
              <div className="access-demo-cover"><img src="/games/rabisco-hero.svg" alt="" /><div><small>JOGUE COM A TURMA</small><strong>Mais uma partida?<br />Só se for junto.</strong><span>Rabisco & SlitherSenai <ArrowUpRight size={14} /></span></div></div>
              <div className="access-demo-bottom"><div><Headphones /><strong>Converse de perto</strong><small>Salas de voz e comunidade</small></div><div><Gamepad2 /><strong>Entre no jogo</strong><small>Salas, convites e conquistas</small></div></div>
            </div>
          </div>
          <div className="access-floating-note"><span>✦</span> Seu lugar é aqui.</div>
        </div>
        <div className="access-showcase-copy"><span>UMA COMUNIDADE. MUITAS POSSIBILIDADES.</span><h2>A sua turma.<br />Um universo de conexões.</h2><p>Conversas, partidas e histórias que continuam depois da aula.</p><div className="access-feature-line"><span>Comunidade</span><span>Jogos</span><span>Social</span><span>Conquistas</span></div></div>
      </aside>
    </main>
  );
}