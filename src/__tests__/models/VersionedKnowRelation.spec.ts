import { describe, it, expect } from 'vitest';
import { VersionedKnowRelation } from '@/services/Models/VersionedKnowRelation';

describe('VersionedKnowRelation', () => {
  it('stores from/to ids, description, strength and version', () => {
    const relation = new VersionedKnowRelation('from-1', 'to-2', 'allies', true, 3);

    expect(relation.fromCharacterId).toBe('from-1');
    expect(relation.toCharacterId).toBe('to-2');
    expect(relation.description).toBe('allies');
    expect(relation.isStrongRelation).toBe(true);
    expect(relation.version).toBe(3);
  });
});
