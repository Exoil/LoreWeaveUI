import { describe, it, expect } from 'vitest';
import { CharacterNode } from '@/models/CharacterNode';
import { Character } from '@/services/Models/Character';

describe('CharacterNode', () => {
  it('sets id, name, and characterData from the given Character', () => {
    const char = new Character('1', 'Aragorn', ['2', '3']);
    const node = new CharacterNode(char);

    expect(node.id).toBe('1');
    expect(node.name).toBe('Aragorn');
    expect(node.characterData).toBe(char);
  });

  it('stores the original knowCharacterIds reference', () => {
    const char = new Character('1', 'Aragorn', ['2']);
    const node = new CharacterNode(char);

    expect(node.characterData.knowCharacterIds).toEqual(['2']);
  });

  it('updateName changes both node.name and characterData.name', () => {
    const node = new CharacterNode(new Character('1', 'Aragorn', []));
    node.updateName('Strider');

    expect(node.name).toBe('Strider');
    expect(node.characterData.name).toBe('Strider');
  });
});
