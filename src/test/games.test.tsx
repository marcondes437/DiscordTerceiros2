import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { games, communityGames, filterGames, configuredGameUrl } from '@/data/games';
import { GameCard } from '@/components/game-card';

afterEach(cleanup);
it('opens a configured game directly from its cover', () => {
  const game = { ...games[0]!, url: 'https://example.com/rabisco' };
  render(<GameCard game={game}/>);
  const link = screen.getByRole('link', { name: `Jogar ${game.name} (nova aba)` });
  expect(link).toHaveAttribute('href', game.url);
  expect(link).toHaveAttribute('target', '_blank');
  expect(link.querySelector('img')).toHaveAttribute('src', game.image);
});

it('combines search and category filters while ignoring accents', () => {
  expect(filterGames('acao', 'Todos').map(g => g.id)).toContain('slithersenai');
  expect(filterGames('Rabisco', 'Criatividade').map(g => g.id)).toEqual(['rabisco']);
  expect(filterGames('Rabisco', 'Ação')).toEqual([]);
  expect(filterGames('', 'Todos')).toHaveLength(games.length);
});

it('preserves community games and does not invent links', () => {
  expect(communityGames.map(g => g.name)).toEqual(['Rabisco', 'SlitherSenai']);
  render(<GameCard game={{ ...games[0]!, url: null }}/>);
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Rabisco — em breve')).toBeInTheDocument();
  expect(configuredGameUrl('')).toBeNull();
  expect(configuredGameUrl('javascript:alert(1)')).toBeNull();
  expect(configuredGameUrl('https://example.com/rabisco')).toBe('https://example.com/rabisco');
});

it('separates solo games from verified online-only arenas', () => {
  expect(filterGames('Vice City', 'Offline').map(g => g.id)).toEqual(['gta-vice-city']);
  expect(filterGames('Quake', 'Offline')).toEqual([]);
  expect(filterGames('Quake', 'Online')).toHaveLength(3);
});

it('lists all submitted games without enabling unavailable or unverified destinations', () => {
  const external = games.filter(g => g.external);
  expect(external).toHaveLength(25);
  expect(new Set(games.map(g => g.id)).size).toBe(games.length);
  expect(external.every(g => g.url ? g.url.startsWith('https://') && !g.url.includes('t.co/') : !!g.unavailableReason)).toBe(true);
  const unavailable = games.find(g => g.id === 'moon-zombies')!;
  render(<GameCard game={unavailable} />);
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Moon Zombies — indisponível')).toBeInTheDocument();
});

it('opens an external game in a separate tab and identifies its source', () => {
  const game = games.find(g => g.id === 'gta-vice-city')!;
  render(<GameCard game={game} />);
  expect(screen.getByRole('link', { name: `Jogar ${game.name} (nova aba)` })).toHaveAttribute('href', 'https://joncodeofficial.github.io/gta-vice-city-wasm/');
  expect(screen.getByText('Site externo')).toBeInTheDocument();
});
