import { describe, it, expect } from 'vitest';
import { KnowRelation } from '@/services/Models/KnowRelation';

describe('KnowRelation', () => {
  it('stores characterId, description, and isStrongRelation', () => {
    const relation = new KnowRelation('char-2', 'old friends', true);

    expect(relation.characterId).toBe('char-2');
    expect(relation.description).toBe('old friends');
    expect(relation.isStrongRelation).toBe(true);
  });

  it('defaults description to empty and isStrongRelation to false', () => {
    const relation = new KnowRelation('char-2');

    expect(relation.description).toBe('');
    expect(relation.isStrongRelation).toBe(false);
  });
});
