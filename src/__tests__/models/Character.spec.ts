import { describe, it, expect } from 'vitest';
import { Character } from '@/services/Models/Character';

describe('Character', () => {
  it('stores id, name, and knowCharacterIds', () => {
    const char = new Character('1', 'Frodo', ['2', '3']);

    expect(char.id).toBe('1');
    expect(char.name).toBe('Frodo');
    expect(char.knowCharacterIds).toEqual(['2', '3']);
  });

  it('defaults knowCharacterIds to an empty array when omitted', () => {
    const char = new Character('1', 'Sam');

    expect(char.knowCharacterIds).toEqual([]);
  });
});
