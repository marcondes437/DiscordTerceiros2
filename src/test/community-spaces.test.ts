import { describe, expect, it } from 'vitest';
import { memberClass, visibleSpaces, spaceChannel, visibleRoom } from '@/lib/community-spaces';

describe('Community class isolation', () => {
  it.each(['terceiro-a', 'terceiro-b'] as const)('shows only general and %s to its members', (turma) => {
    expect(visibleSpaces(memberClass({ turma })).map((s) => s.id)).toEqual(['geral', turma]);
  });
  it('keeps members without a recognized class in general', () => {
    expect(visibleSpaces(memberClass({ turma: 'other' })).map((s) => s.id)).toEqual(['geral']);
    expect(memberClass(undefined)).toBeNull();
  });
  it('keeps channel histories separate and preserves general channel identifiers', () => {
    expect(spaceChannel('geral', 'geral')).toBe('geral');
    expect(spaceChannel('terceiro-a', 'geral')).toBe('terceiro-a:geral');
    expect(spaceChannel('terceiro-b', 'geral')).toBe('terceiro-b:geral');
  });
  it('does not expose private room activity in general or the other class', () => {
    expect(visibleRoom('terceiro-a:conexao-livre', 'geral')).toBeNull();
    expect(visibleRoom('terceiro-a:conexao-livre', 'terceiro-b')).toBeNull();
    expect(visibleRoom('terceiro-a:conexao-livre', 'terceiro-a')).toBe('terceiro-a:conexao-livre');
    expect(visibleRoom('conexao-livre', 'geral')).toBe('conexao-livre');
  });
});
