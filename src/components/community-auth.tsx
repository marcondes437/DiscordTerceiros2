import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LogIn } from 'lucide-react';

function authMessage(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  if (/invalid login credentials/i.test(msg)) return 'Email ou senha incorretos.';
  if (/email not confirmed/i.test(msg)) return 'Confirme seu email antes de entrar. Confira também a caixa de spam.';
  if (/already registered/i.test(msg)) return 'Esse email já tem conta. Entre com sua senha.';
  if (/rate limit/i.test(msg)) return 'Muitas tentativas. Espere alguns minutos e tente novamente.';
  return msg || 'Não foi possível entrar. Tente novamente.';
}

export function CommunityAuth({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-sm"><AuthForm onSuccess={() => onOpenChange(false)} dialog /></DialogContent></Dialog>;
}

export function AuthForm({ onSuccess, dialog = false, appearance = 'default' }: { onSuccess: () => void; dialog?: boolean; appearance?: 'default' | 'minimal' }) {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [turma, setTurma] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || (signup && (!name.trim() || !['terceiro-a', 'terceiro-b'].includes(turma)))) return;
    setBusy(true);
    setNotice('');
    try {
      const { error, data } = signup
        ? await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim(), turma }, emailRedirectTo: `${window.location.origin}/` } })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (data.session) onSuccess();
      else {
        setNotice('Conta criada! Confirme pelo link enviado ao seu email e depois entre com sua senha.');
        setSignup(false);
        setPassword('');
      }
    } catch (err) { setNotice(authMessage(err)); }
    finally { setBusy(false); }
  }

  function changeMode(value: boolean) { setSignup(value); setNotice(''); }

  return <div className={`auth-form ${appearance === 'minimal' ? 'auth-minimal' : ''}`}>
    <div className="brand-name"><span>SENAI</span> Conecta</div>
    {dialog ? <><DialogTitle>{signup ? 'Criar conta' : 'Entrar na comunidade'}</DialogTitle><DialogDescription>Conecte-se com a sua turma.</DialogDescription></> : <><h1>{appearance === 'minimal' ? (signup ? 'Crie sua conta no Conecta' : 'Bem-vindo de volta') : (signup ? 'Sua turma te espera.' : 'Bom te ver por aqui.')}</h1><p className="auth-description">{signup ? 'Crie sua conta e faça parte dessa história.' : 'Entre na sua conta. A conexão começa aqui.'}</p></>}
    <div className="auth-fields-panel">
    <div className="auth-tabs" aria-label="Tipo de acesso"><button disabled={busy} type="button" aria-pressed={!signup} onClick={() => changeMode(false)}>Entrar</button><button disabled={busy} type="button" aria-pressed={signup} onClick={() => changeMode(true)}>Criar conta</button></div>
    <form onSubmit={submit} className="grid gap-4">
      <fieldset disabled={busy} className="grid min-w-0 gap-4">
        {signup && <label className="grid gap-2 text-sm font-medium">Seu nome<Input required autoComplete="name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Como podemos te chamar?" /></label>}
        <label className="grid gap-2 text-sm font-medium">Email<Input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" /></label>
        <label className="grid gap-2 text-sm font-medium">Senha<Input required type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={signup ? 'Pelo menos 8 caracteres' : 'Sua senha'} /></label>
        {signup && <fieldset className="auth-class"><legend>Qual é a sua turma?</legend><div>{(['terceiro-a', 'terceiro-b'] as const).map((value) => <label key={value} className={turma === value ? 'is-selected' : ''}><input required type="radio" name="turma" value={value} checked={turma === value} onChange={() => setTurma(value)} /><span>Terceiro <strong>{value === 'terceiro-a' ? 'A' : 'B'}</strong></span></label>)}</div></fieldset>}
      </fieldset>
      {notice && <p role="status" className="auth-notice">{notice}</p>}
      <Button disabled={busy} type="submit"><LogIn />{busy ? 'Aguarde…' : signup ? 'Criar minha conta' : 'Entrar na comunidade'}</Button>
    </form>
    <p className="auth-switch">{signup ? 'Já faz parte?' : 'Ainda não tem uma conta?'} <button disabled={busy} type="button" onClick={() => changeMode(!signup)}>{signup ? 'Entrar' : 'Cadastre-se'}</button></p>
    </div>
  </div>;
}
