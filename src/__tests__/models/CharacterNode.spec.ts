import { describe, it, expect } from 'vitest';
import { CharacterNode } from '@/models/CharacterNode';
import { Character } from '@/services/Models/Character';
import { KnowRelation } from '@/services/Models/KnowRelation';

describe('CharacterNode', () => {
  it('sets id, name, and characterData from the given Character', () => {
    const char = new Character('1', 'Aragorn', [new KnowRelation('2'), new KnowRelation('3')]);
    const node = new CharacterNode(char);

    expect(node.id).toBe('1');
    expect(node.name).toBe('Aragorn');
    expect(node.characterData).toBe(char);
  });

  it('stores the original knowCharacters reference', () => {
    const relations = [new KnowRelation('2')];
    const char = new Character('1', 'Aragorn', relations);
    const node = new CharacterNode(char);

    expect(node.characterData.knowCharacters).toBe(relations);
  });

  it('updateName changes both node.name and characterData.name', () => {
    const node = new CharacterNode(new Character('1', 'Aragorn', []));
    node.updateName('Strider');

    expect(node.name).toBe('Strider');
    expect(node.characterData.name).toBe('Strider');
  });
});
