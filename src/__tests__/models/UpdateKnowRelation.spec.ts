import { describe, it, expect } from 'vitest';
import { UpdateKnowRelation } from '@/services/Models/UpdateKnowRelation';

describe('UpdateKnowRelation', () => {
  it('stores from/to ids, description, strength and version', () => {
    const update = new UpdateKnowRelation('from-1', 'to-2', 'former allies', false, 5);

    expect(update.fromCharacterId).toBe('from-1');
    expect(update.toCharacterId).toBe('to-2');
    expect(update.description).toBe('former allies');
    expect(update.isStrongRelation).toBe(false);
    expect(update.version).toBe(5);
  });
});
