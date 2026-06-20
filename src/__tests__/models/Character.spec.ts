import { describe, it, expect } from 'vitest';
import { Character } from '@/services/Models/Character';
import { KnowRelation } from '@/services/Models/KnowRelation';

describe('Character', () => {
  it('stores id, name, and knowCharacters', () => {
    const relations = [new KnowRelation('2', 'friends', true), new KnowRelation('3', '', false)];
    const char = new Character('1', 'Frodo', relations);

    expect(char.id).toBe('1');
    expect(char.name).toBe('Frodo');
    expect(char.knowCharacters).toBe(relations);
  });

  it('defaults knowCharacters to an empty array when omitted', () => {
    const char = new Character('1', 'Sam');

    expect(char.knowCharacters).toEqual([]);
  });
});
