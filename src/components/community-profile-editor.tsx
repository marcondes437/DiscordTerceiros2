import { AvatarDecoration, ProfileEffect, profileStyles, profileEffects } from './profile-decorations';
import { ProfilePhoto } from './profile-photo';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ArrowLeft, Camera, Check, ImagePlus, Save, UserRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { CommunityProfile } from '@/hooks/use-community-profiles';

export function profileImageError(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) return 'Escolha uma imagem JPG, PNG, WebP ou GIF.';
  if (file.size > 5 * 1024 * 1024) return 'A imagem deve ter no máximo 5 MB.';
  return null;
}

function useImagePreview(file: File | null, saved?: string) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!file) { setUrl(undefined); return; }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url ?? saved;
}

export function CommunityProfileEditor({ user, profile, onClose, onSaved }: { user: User; profile?: CommunityProfile; onClose: () => void; onSaved: () => Promise<void> }) {
  const initialName = profile?.display_name || String(user.user_metadata?.display_name || user.user_metadata?.full_name || 'Aluno');
  const [nickname, setNickname] = useState(initialName);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [decoration, setDecoration] = useState(profile?.avatar_decoration ?? 'none');
  const [effect, setEffect] = useState(profile?.profile_effect ?? 'none');
  const [color, setColor] = useState(profile?.banner_color ?? '#353741');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const avatarSrc = useImagePreview(avatar, removeAvatar ? undefined : profile?.avatarSrc);
  const bannerSrc = useImagePreview(banner, removeBanner ? undefined : profile?.bannerSrc);

  function choose(file: File | undefined, kind: 'avatar' | 'banner') {
    if (!file) return;
    const failure = profileImageError(file);
    if (failure) { setError(failure); return; }
    setError(''); setSaved(false);
    if (kind === 'avatar') { setAvatar(file); setRemoveAvatar(false); }
    else { setBanner(file); setRemoveBanner(false); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const displayName = nickname.trim();
    if (!displayName || displayName.length > 60) { setError('O apelido precisa ter entre 1 e 60 caracteres.'); return; }
    setBusy(true); setError(''); setSaved(false);
    const uploads: string[] = [];
    let committed = false;
    try {
      const upload = async (file: File | null, kind: string, old: string | null | undefined, removed: boolean) => {
        if (!file) return removed ? null : old ?? null;
        const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[file.type];
        const path = `${user.id}/${kind}-${crypto.randomUUID()}.${ext}`;
        const result = await supabase.storage.from('community-profiles').upload(path, file, { contentType: file.type, upsert: false });
        if (result.error) throw result.error;
        uploads.push(path);
        return path;
      };
      const avatarPath = await upload(avatar, 'avatar', profile?.avatar_url, removeAvatar);
      const bannerPath = await upload(banner, 'banner', profile?.banner_url, removeBanner);
      const result = await (supabase as any).from('social_profiles').upsert({ id: user.id, display_name: displayName, bio: bio.trim(), banner_color: color, avatar_decoration: decoration, profile_effect: effect, avatar_url: avatarPath, banner_url: bannerPath });
      if (result.error) throw result.error;
      committed = true;
      // Keep older parts of the site that use auth metadata in sync with the nickname.
      const authResult = await supabase.auth.updateUser({ data: { display_name: displayName } });
      const obsolete = [profile?.avatar_url !== avatarPath ? profile?.avatar_url : null, profile?.banner_url !== bannerPath ? profile?.banner_url : null].filter((path): path is string => !!path && path.startsWith(`${user.id}/`));
      if (obsolete.length) await supabase.storage.from('community-profiles').remove(obsolete);
      await onSaved();
      setSaved(true);
      if (authResult.error) setError('Perfil salvo. A atualização do apelido nas outras áreas pode levar alguns instantes.');
    } catch {
      if (!committed && uploads.length) await supabase.storage.from('community-profiles').remove(uploads);
      setError(committed ? 'Perfil salvo, mas não foi possível atualizar a prévia. Reabra seu perfil.' : 'Não foi possível salvar. Suas alterações foram mantidas; tente novamente.');
    } finally { setBusy(false); }
  }

  return <section className="profile-editor" aria-label="Editar perfil da comunidade">
    <header className="profile-editor-header"><div><span>CONFIGURAÇÕES DA COMUNIDADE</span><h1>Seu perfil</h1></div><button className="icon-btn" aria-label="Voltar à comunidade" onClick={onClose} disabled={busy}><ArrowLeft/></button></header>
    <div className="profile-editor-layout">
      <form className="profile-editor-form" onSubmit={save} onChange={() => setSaved(false)}>
        <h2><UserRound size={18}/> Perfil principal</h2>
        <fieldset disabled={busy}>
          <label className="profile-field">Apelido<input maxLength={60} value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Como você quer ser chamado" required/><small>É assim que seu nome aparece nos chats e nas mensagens privadas.</small></label>
          <div className="profile-field"><span>Foto do perfil</span><div className="profile-image-controls"><div className="profile-small-avatar">{avatarSrc ? <ProfilePhoto staticImage={avatar ? ["image/jpeg", "image/png"].includes(avatar.type) : undefined} src={avatarSrc} alt="Prévia da sua foto"/> : nickname.slice(0,1).toUpperCase()}</div><label className="profile-upload"><Camera size={17}/> Alterar foto<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Escolher foto do perfil" onChange={e => { choose(e.target.files?.[0], 'avatar'); e.target.value = ''; }}/></label><button type="button" className="profile-remove" onClick={() => { setAvatar(null); setRemoveAvatar(true); }}>Remover</button></div></div>
          <div className="profile-field"><span>Imagem da capa</span><label className="profile-upload profile-upload-banner"><ImagePlus size={18}/> Escolher imagem do dispositivo<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Escolher imagem da capa" onChange={e => { choose(e.target.files?.[0], 'banner'); e.target.value = ''; }}/></label><button type="button" className="profile-remove" onClick={() => { setBanner(null); setRemoveBanner(true); }}>Remover capa</button><small>JPG, PNG, WebP ou GIF. Até 5 MB por imagem.</small></div>
          <div className="profile-style-field"><h3>Decoração do avatar</h3><p>Uma moldura animada ao redor da sua foto.</p><div className="profile-style-grid" role="group" aria-label="Decoração do avatar">{profileStyles.map(style => <button type="button" key={style.id} aria-label={style.name} aria-pressed={decoration === style.id} onClick={() => { setDecoration(style.id); setSaved(false); }}><div className="profile-style-avatar">{avatarSrc ? <img src={avatarSrc} alt=""/> : nickname.slice(0,1).toUpperCase()}<AvatarDecoration theme={style.id}/></div><span>{style.name}</span></button>)}</div></div>
          <div className="profile-style-field"><h3>Efeito de perfil</h3><p>Movimento e atmosfera sobre o seu cartão.</p><div className="profile-style-grid profile-effect-grid" role="group" aria-label="Efeito de perfil">{profileEffects.map(style => <button type="button" key={style.id} aria-label={style.name} aria-pressed={effect === style.id} onClick={() => { setEffect(style.id); setSaved(false); }}><div className="profile-effect-sample"><ProfileEffect theme={style.id}/><span>{style.id === 'none' ? '—' : '✦'}</span></div><span>{style.name}</span></button>)}</div></div>
          <label className="profile-field">Cor da faixa<input type="color" value={color} onChange={e => setColor(e.target.value)}/></label>
          <label className="profile-field">Sobre mim<textarea value={bio} maxLength={190} rows={4} onChange={e => setBio(e.target.value)} placeholder="Conte um pouco sobre você..."/><small>{bio.length}/190 caracteres</small></label>
        </fieldset>
        {error && <p className="profile-editor-error" role="alert">{error}</p>}
        {saved && <p className="profile-editor-saved" role="status"><Check size={16}/> Perfil salvo!</p>}
        <div className="profile-save-bar"><button type="button" onClick={onClose} disabled={busy}>Voltar</button><button type="submit" disabled={busy}><Save size={16}/>{busy ? 'Salvando...' : 'Salvar alterações'}</button></div>
      </form>
      <aside className="profile-live-preview"><h2>PRÉVIA DO PERFIL</h2><article className="profile-preview-card"><ProfileEffect theme={effect}/><div className="profile-preview-banner" style={{ backgroundColor: color }}>{bannerSrc && <img src={bannerSrc} alt="Prévia da capa"/>}</div><div className="profile-preview-details"><div className="profile-preview-avatar">{avatarSrc ? <ProfilePhoto staticImage={avatar ? ["image/jpeg", "image/png"].includes(avatar.type) : undefined} src={avatarSrc} alt="Seu avatar"/> : nickname.slice(0,1).toUpperCase()}<span/><AvatarDecoration theme={decoration}/></div><h3>{nickname.trim() || 'Seu apelido'}</h3><span className="profile-preview-handle">@{user.id.slice(0,8)}</span><div className="profile-preview-about"><strong>SOBRE MIM</strong><p>{bio.trim() || 'Seu espaço para contar sua história.'}</p><strong>MEMBRO DESDE</strong><p>{new Date(user.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div></div></article><p className="profile-preview-tip">Sua foto e seu apelido acompanham você pela comunidade.</p></aside>
    </div>
  </section>;
}




