import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import { afterEach, expect, it, vi } from 'vitest';
import { CommunityProfileEditor, profileImageError } from '@/components/community-profile-editor';

const mocks = vi.hoisted(() => ({ upsert: vi.fn(), upload: vi.fn(), updateUser: vi.fn(), remove: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => ({ upsert: mocks.upsert }),
  auth: { updateUser: mocks.updateUser },
  storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
} }));
const user = { id: 'member-id', user_metadata: { display_name: 'Samuel' }, created_at: '2026-10-01T00:00:00Z' } as User;
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('rejects unsupported and oversized image files', () => {
  expect(profileImageError(new File(['<svg/>'], 'photo.svg', { type: 'image/svg+xml' }))).toContain('JPG');
  expect(profileImageError(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'photo.png', { type: 'image/png' }))).toContain('5 MB');
  expect(profileImageError(new File(['photo'], 'photo.png', { type: 'image/png' }))).toBeNull();
  expect(profileImageError(new File(['GIF89a'], 'animated.gif', { type: 'image/gif' }))).toBeNull();
});

it('previews nickname changes and persists the profile with a device photo', async () => {
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  const onSaved = vi.fn().mockResolvedValue(undefined);
  render(<CommunityProfileEditor user={user} onClose={vi.fn()} onSaved={onSaved}/>);
  fireEvent.change(screen.getByLabelText(/Apelido/), { target: { value: 'Sam' } });
  expect(screen.getByRole('heading', { name: 'Sam' })).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole('group', { name: 'Decoração do avatar' })).getByRole('button', { name: 'Jardim Sakura' }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Efeito de perfil' })).getByRole('button', { name: /Lorde Sombrio/ }));
  const photo = new File(['photo'], 'photo.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Escolher foto do perfil'), { target: { files: [photo] } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(mocks.upload).toHaveBeenCalledWith(expect.stringMatching(/^member-id\/avatar-.+\.png$/), photo, expect.objectContaining({ upsert: false }));
  expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: user.id, display_name: 'Sam', avatar_decoration: 'sakura', profile_effect: 'shadow', avatar_url: expect.stringMatching(/^member-id\//) }));
  expect(await screen.findByRole('status')).toHaveTextContent('Perfil salvo');
});

