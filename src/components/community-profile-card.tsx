import { AvatarDecoration, ProfileEffect } from './profile-decorations';
import { ProfilePhoto } from './profile-photo';
import { useState, type ReactNode } from 'react';
import { MessageCircle, Settings, Volume2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { CommunityProfile } from '@/hooks/use-community-profiles';
import { CommunityFullProfile } from './community-full-profile';
import { ProfileFriendButton } from './profile-friend-button';

export function CommunityProfileCard({ children, id, name, profile, online = false, room, self = false, onMessage, onEdit, onRoom }: { children: ReactNode; id: string; name: string; profile?: CommunityProfile; online?: boolean; room?: string; self?: boolean; onMessage: (id: string) => void; onEdit?: () => void; onRoom?: () => void }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const displayName = profile?.display_name || name;
  return <><Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><button type="button" className="profile-card-trigger" aria-label={`Ver perfil de ${displayName}`}>{children}</button></PopoverTrigger>
    <PopoverContent className="community-profile-card" side="left" align="start" sideOffset={14} collisionPadding={12} onCloseAutoFocus={event => { if (expanded) event.preventDefault(); }} aria-label={`Perfil de ${displayName}`}>
      <ProfileEffect theme={profile?.profile_effect}/>
      {!self && open && <ProfileFriendButton id={id} name={displayName}/>}
      <div className="community-profile-cover" style={{ backgroundColor: profile?.banner_color || '#18181b' }}>{profile?.bannerSrc && <img src={profile.bannerSrc} alt="Capa do perfil"/>}</div>
      <div className="community-profile-content">
        <button type="button" className="community-profile-photo" title="Ver perfil completo" aria-label={`Abrir perfil completo de ${displayName}`} onClick={() => { setOpen(false); setExpanded(true); }}>{profile?.avatarSrc ? <ProfilePhoto src={profile.avatarSrc} alt={`Foto de ${displayName}`}/> : displayName.slice(0,1).toUpperCase()}<span className={online ? 'is-online' : ''} aria-label={online ? 'Online' : 'Offline'}/><AvatarDecoration theme={profile?.avatar_decoration}/></button>
        <h2>{displayName}</h2><p className="community-profile-handle">@{id.slice(0,8)}</p>
        <span className="community-profile-status">{room ? 'Em voz' : online ? 'Online na comunidade' : 'Offline'}</span>
        {profile?.bio && <div className="community-profile-bio"><h3>SOBRE MIM</h3><p>{profile.bio}</p></div>}
        {profile?.created_at && <div className="community-profile-since"><h3>NA COMUNIDADE DESDE</h3><p>{new Date(profile.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>}
        {room && <div className="community-profile-voice"><strong><Volume2 size={15}/>Em voz</strong><p>{room}</p><button type="button" onClick={() => { setOpen(false); onRoom?.(); }}>Abrir sala de voz</button></div>}
        {self ? <button className="community-profile-action" onClick={() => { setOpen(false); onEdit?.(); }}><Settings size={16}/>Editar meu perfil</button> : <button className="community-profile-action" onClick={() => { setOpen(false); onMessage(id); }}><MessageCircle size={17}/>Conversar com {displayName}</button>}
      </div>
    </PopoverContent>
  </Popover><CommunityFullProfile open={expanded} onOpenChange={setExpanded} id={id} name={name} profile={profile} online={online} room={room} self={self} onMessage={onMessage} onEdit={onEdit} onRoom={onRoom}/></>;
}
