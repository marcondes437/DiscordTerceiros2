import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';

// Login com Google: ative o provedor Google no painel do Supabase
// (Authentication → Sign In / Providers) e defina VITE_GOOGLE_LOGIN=true no .env.
const googleEnabled = (import.meta.env as Record<string, string | undefined>)['VITE_GOOGLE_LOGIN'] === 'true';

function authMessage(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (/invalid login credentials/i.test(msg)) return 'Email ou senha incorretos.';
  if (/email not confirmed/i.test(msg)) return 'Confirme seu email antes de entrar. Procure a mensagem na caixa de entrada ou no spam.';
  if (/already registered/i.test(msg)) return 'Esse email já tem conta. Use "Já tenho uma conta".';
  if (/rate limit/i.test(msg)) return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
  if (/password/i.test(msg)) return 'A senha precisa ter pelo menos 8 caracteres.';
  return msg || 'Não foi possível entrar.';
}

export function CommunityAuth({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error, data } = signup
        ? await supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: window.location.origin } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        onOpenChange(false);
        toast.success('Bem-vindo à comunidade!');
      } else {
        toast.success('Conta criada. Confirme pelo link que enviamos para o seu email.');
      }
    } catch (err) {
      toast.error(authMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) toast.error(authMessage(error));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <div className="brand-name"><span>SENAI</span> Conecta</div>
        <DialogTitle>{signup ? 'Criar conta' : 'Entrar na comunidade'}</DialogTitle>
        <DialogDescription>{signup ? 'Crie sua conta para conversar com a sua turma.' : 'Use o email e a senha da sua conta.'}</DialogDescription>
        <form onSubmit={submit} className="grid gap-4">
          {signup && (
            <label className="grid gap-2 text-sm font-medium">
              Seu nome
              <Input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Como podemos te chamar?" />
            </label>
          )}
          <label className="grid gap-2 text-sm font-medium">
            Email
            <Input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Senha
            <Input required type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Pelo menos 8 caracteres" />
          </label>
          <Button disabled={busy} type="submit">
            <LogIn />
            {busy ? 'Aguarde…' : signup ? 'Criar conta' : 'Entrar'}
          </Button>
        </form>
        {googleEnabled && (
          <>
            <div className="day-divider"><span>ou</span></div>
            <Button variant="outline" onClick={() => void google()}>Continuar com Google</Button>
          </>
        )}
        <Button variant="link" onClick={() => setSignup(!signup)}>
          {signup ? 'Já tenho uma conta' : 'Ainda não tenho uma conta'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
