import { AvatarDecoration, ProfileEffect } from './profile-decorations';
import { useState } from 'react';
import { MessageCircle, Settings, Volume2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ProfilePhoto } from './profile-photo';
import type { CommunityProfile } from '@/hooks/use-community-profiles';

export function CommunityFullProfile({ open, onOpenChange, id, name, profile, online, room, self, onMessage, onEdit, onRoom }: { open: boolean; onOpenChange: (open: boolean) => void; id: string; name: string; profile?: CommunityProfile; online: boolean; room?: string; self: boolean; onMessage: (id: string) => void; onEdit?: () => void; onRoom?: () => void }) {
  const [tab, setTab] = useState<'activity' | 'about'>('activity');
  const displayName = profile?.display_name || name;
  const since = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="full-member-profile">
    <DialogTitle className="sr-only">Perfil completo de {displayName}</DialogTitle>
    <DialogDescription className="sr-only">Informações e atividade de {displayName} na comunidade.</DialogDescription>
    <div className="full-profile-layout">
      <article className="full-profile-identity"><ProfileEffect theme={profile?.profile_effect}/>
        <div className="full-profile-banner" style={{ backgroundColor: profile?.banner_color || '#0c0c0d' }}>{profile?.bannerSrc && <img src={profile.bannerSrc} alt="Capa do perfil"/>}</div>
        <div className="full-profile-details">
          <div className="full-profile-avatar">{profile?.avatarSrc ? <ProfilePhoto src={profile.avatarSrc} alt={`Foto ampliada de ${displayName}`}/> : displayName.slice(0,1).toUpperCase()}<span className={online ? 'is-online' : ''}/><AvatarDecoration theme={profile?.avatar_decoration}/></div>
          <h2>{displayName}</h2><p className="full-profile-handle">@{id.slice(0,8)}</p>
          <span className="community-profile-status">{room ? 'Em voz' : online ? 'Online na comunidade' : 'Offline'}</span>
          {self ? <button className="full-profile-message" onClick={() => { onOpenChange(false); onEdit?.(); }}><Settings size={16}/>Editar meu perfil</button> : <button className="full-profile-message" onClick={() => { onOpenChange(false); onMessage(id); }}><MessageCircle size={16}/>Mensagem</button>}
          {profile?.bio && <p className="full-profile-bio">{profile.bio}</p>}
          {since && <div className="full-profile-since"><h3>Membro desde</h3><p>{since}</p></div>}
        </div>
      </article>
      <section className="full-profile-right">
        <div className="full-profile-tabs" role="tablist" aria-label="Informações do perfil"><button role="tab" id={`profile-activity-${id}`} aria-controls={`profile-panel-${id}`} aria-selected={tab === 'activity'} onClick={() => setTab('activity')}>Atividade</button><button role="tab" id={`profile-about-${id}`} aria-controls={`profile-panel-${id}`} aria-selected={tab === 'about'} onClick={() => setTab('about')}>Sobre o perfil</button></div>
        <div role="tabpanel" id={`profile-panel-${id}`} aria-labelledby={`profile-${tab}-${id}`}>
          {tab === 'activity' ? <><h3 className="full-profile-section-label">Atividade atual</h3><div className="full-profile-activity"><Volume2 size={30}/><div><strong>{room ? 'Em uma sala de voz' : online ? 'Online na comunidade' : 'Offline'}</strong><p>{room || 'Nenhuma atividade de voz no momento.'}</p></div>{room && <button onClick={() => { onOpenChange(false); onRoom?.(); }}>Abrir sala de voz</button>}</div><p className="full-profile-footnote">A atividade é atualizada de acordo com a presença na comunidade.</p></> : <><h3 className="full-profile-section-label">Sobre mim</h3><div className="full-profile-about"><p>{profile?.bio || 'Este membro ainda não adicionou uma bio.'}</p>{since && <><h3>Na comunidade desde</h3><p>{since}</p></>}</div></>}
        </div>
      </section>
    </div>
  </DialogContent></Dialog>;
}
