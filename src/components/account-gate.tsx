import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthForm } from '@/components/community-auth';
import { BrandLogo } from '@/components/brand-logo';

export function AccountGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let live = true;
    let changed = false;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      changed = true;
      if (live) { setAuthenticated(Boolean(session)); setChecking(false); }
    });
    void supabase.auth.getUser().then(({ data }) => {
      if (live && !changed) { setAuthenticated(Boolean(data.user)); setChecking(false); }
    }).catch(() => { if (live && !changed) setChecking(false); });
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);

  if (authenticated) return children;
  return (
    <main className="account-page">
      <header className="account-header"><BrandLogo /><span>DUAS TURMAS. UMA CONEXÃO.</span></header>
      <div className="account-layout">
        <section className="account-story" aria-label="Terceiro A e Terceiro B">
          <span className="account-eyebrow">NOSSO ÚLTIMO ANO. NOSSA HISTÓRIA.</span>
          <div className="account-rivalry" aria-hidden="true"><div><span>TERCEIRO</span><strong>A</strong></div><em>vs</em><div><span>TERCEIRO</span><strong>B</strong></div></div>
          <h2>A rivalidade conecta.<br /><span>A amizade fica.</span></h2>
          <p>Seu espaço para conversar, compartilhar e viver o terceiro ano com a sua turma.</p>
        </section>
        <section className="account-card" aria-label="Acesso à comunidade">
          {checking ? <p role="status">Preparando sua conexão…</p> : <AuthForm onSuccess={() => setAuthenticated(true)} />}
        </section>
      </div>
      <footer className="account-footer">TERCEIRO A & TERCEIRO B <span>O último ano é só o começo.</span></footer>
    </main>
  );
}
