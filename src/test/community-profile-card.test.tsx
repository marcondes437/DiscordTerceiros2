import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CommunityProfileCard } from '@/components/community-profile-card';

afterEach(cleanup);

it('opens a member profile and starts a private conversation with that member', async () => {
  const onMessage = vi.fn();
  render(<CommunityProfileCard id="member-id" name="Samuel" online onMessage={onMessage}>Samuel</CommunityProfileCard>);
  fireEvent.click(screen.getByRole('button', { name: 'Ver perfil de Samuel' }));
  expect(await screen.findByRole('heading', { name: 'Samuel' })).toBeInTheDocument();
  expect(screen.getByText('Online na comunidade')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Conversar com Samuel' }));
  expect(onMessage).toHaveBeenCalledWith('member-id');
});

it('offers profile editing instead of a private conversation with yourself', async () => {
  const onEdit = vi.fn();
  render(<CommunityProfileCard id="self" name="Samuel" self onMessage={vi.fn()} onEdit={onEdit}>Avatar</CommunityProfileCard>);
  fireEvent.click(screen.getByRole('button', { name: 'Ver perfil de Samuel' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Editar meu perfil' }));
  expect(onEdit).toHaveBeenCalled();
});

it('opens the full profile window when the avatar in the small card is clicked', async () => {
  render(<CommunityProfileCard id="member-id" name="Samuel" online onMessage={vi.fn()}>Samuel</CommunityProfileCard>);
  fireEvent.click(screen.getByRole('button', { name: 'Ver perfil de Samuel' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Abrir perfil completo de Samuel' }));
  expect(await screen.findByRole('dialog', { name: 'Perfil completo de Samuel' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Atividade' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(screen.getByRole('tab', { name: 'Sobre o perfil' }));
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Este membro ainda não adicionou uma bio.');
});
