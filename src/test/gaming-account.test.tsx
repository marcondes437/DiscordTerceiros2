import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useGamingAccount } from '@/hooks/use-gaming-account';

const mocks = vi.hoisted(() => ({ updateUser: vi.fn() }));
vi.mock('@/hooks/use-community-profiles', () => ({ useCommunityProfiles: () => ({ profiles: {} }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: {
  getUser: async () => ({ data: { user: { id: 'member', user_metadata: { display_name: 'Samuel', favorite_games: [] } } } }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  updateUser: mocks.updateUser,
} } }));

it('saves favorites on the account and keeps them when a later update fails', async () => {
  const { result } = renderHook(() => useGamingAccount());
  await waitFor(() => expect(result.current.user?.id).toBe('member'));
  mocks.updateUser.mockResolvedValueOnce({ error: null, data: { user: { id: 'member', user_metadata: { favorite_games: ['rabisco'] } } } });
  await act(() => result.current.toggleFavorite('rabisco'));
  expect(mocks.updateUser).toHaveBeenCalledWith({ data: { favorite_games: ['rabisco'] } });
  expect(result.current.favorites).toEqual(['rabisco']);
  mocks.updateUser.mockResolvedValueOnce({ error: { message: 'offline' } });
  await act(() => result.current.toggleFavorite('slithersenai'));
  expect(result.current.favorites).toEqual(['rabisco']);
  expect(result.current.error).toContain('Não foi possível');
});
