import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Clock3, Gamepad2, Heart, Image, LogOut, Sparkles, Trophy } from 'lucide-react';
import { SocialSiteShell } from '@/components/social-site-shell';
import { CommunityAuth } from '@/components/community-auth';
import { ProfilePhoto } from '@/components/profile-photo';
import { GameCard } from '@/components/game-card';
import { useGamingAccount } from '@/hooks/use-gaming-account';
import { games } from '@/data/games';
import { supabase } from '@/integrations/supabase/client';
import './jogos.css';
import './perfil-jogos.css';

export const Route = createFileRoute('/perfil-jogos')({ head: () => ({ meta: [{ title: 'Meu perfil de jogos | SENAI Conecta' }] }), component: GamingProfile });

function GamingProfile() {
  const { user, profile, name, favorites, toggleFavorite, busy, error } = useGamingAccount();
  const [authOpen, setAuthOpen] = useState(false);
  const favoriteGames = games.filter(g => favorites.includes(g.id));
  return <SocialSiteShell user={user} name={name} activePage="gaming-profile" onSignIn={() => setAuthOpen(true)}><div className="gaming-profile-page">
    <header className="gaming-profile-toolbar"><Link to="/jogos"><ArrowLeft size={20}/>Perfil de jogos</Link><span>SENAI CONECTA</span></header>
    <section className="gaming-profile-hero"><div className="gaming-profile-backdrop" style={{ backgroundColor: profile?.banner_color || '#16161b' }}>{profile?.bannerSrc && <img src={profile.bannerSrc} alt=""/>}</div><div className="gaming-profile-hero-shade"/><span className="gaming-profile-eyebrow">JOGAR É MELHOR EM COMUNIDADE.</span><div className="gaming-profile-identity"><div className="gaming-profile-photo">{profile?.avatarSrc ? <ProfilePhoto src={profile.avatarSrc} alt={`Foto de ${name}`}/> : name.slice(0,1).toUpperCase()}</div><div><h1>{name}</h1><span>@{user?.id.slice(0,8) || 'visitante'}</span>{profile?.bio && <p>{profile.bio}</p>}</div>{user && <button className="gaming-profile-logout" onClick={() => void supabase.auth.signOut()}><LogOut size={16}/>Sair da conta</button>}</div></section>
    <div className="gaming-profile-content"><section className="gaming-profile-stats" aria-label="Seu perfil em números"><div className="gaming-stat gaming-stat-time"><Clock3/><strong>—</strong><span>Tempo jogado</span><small>Suas partidas ainda vão começar.</small></div><div className="gaming-stat"><Gamepad2/><strong>{games.length}</strong><span>Jogos da comunidade</span></div><div className="gaming-stat"><Heart/><strong>{favorites.length}</strong><span>Seus favoritos</span></div><div className="gaming-stat gaming-stat-favorite">{favoriteGames[0] ? <><img src={favoriteGames[0].image} alt=""/><strong>{favoriteGames[0].name}</strong><span>Na sua coleção</span></> : <><Sparkles/><strong>Seu próximo favorito</strong><span>Escolha um jogo abaixo</span></>}</div><div className="gaming-stat"><Trophy/><strong>—</strong><span>Conquistas</span><small>Uma história para construir.</small></div></section>
      <section className="gaming-library"><div className="gaming-section-heading"><div><span>FEITOS PELA NOSSA TURMA</span><h2>Seus jogos</h2></div><Link to="/jogos">Explorar catálogo<ArrowUpRight size={15}/></Link></div><div className="gaming-profile-game-grid">{games.map(game => <GameCard key={game.id} game={game} favorite={favorites.includes(game.id)} onFavorite={() => void toggleFavorite(game.id)} busy={busy || !user}/>)}</div>{error && <p className="gaming-profile-error" role="alert">{error}</p>}<p className="gaming-availability-note">Rabisco e SlitherSenai estão chegando. Os botões para jogar serão liberados quando os sites estiverem disponíveis.</p></section>
      <section className="gaming-memories"><div className="gaming-section-heading"><div><span>CADA PARTIDA VIRA HISTÓRIA</span><h2>Lembranças</h2></div></div><div className="gaming-memory-empty"><Image size={30}/><div><h3>Os melhores momentos ainda estão por vir.</h3><p>Reúna a turma. Sua próxima história começa com a primeira partida.</p></div></div></section>
      <footer className="gaming-profile-footer"><span>UM PERFIL. DUAS TURMAS. MUITAS HISTÓRIAS.</span><p>{user?.created_at ? `Na comunidade desde ${new Date(user.created_at).toLocaleDateString('pt-BR')}.` : 'Entre na comunidade para criar sua coleção.'}</p></footer>
    </div>
  </div><CommunityAuth open={authOpen} onOpenChange={setAuthOpen}/></SocialSiteShell>;
}
