import { describe, it, expect } from 'vitest';
import { ActorCharacter } from '@/foundry/ActorCharacter';
import { CHARACTER_NAME_MAX_LENGTH } from '@/services/Models/ValidationRules';

describe('ActorCharacter.fromDocument', () => {
  it('reads the actor identity into a character payload', () => {
    const actor = ActorCharacter.fromDocument({ id: 'actor-1', name: 'Gandalf' });

    expect(actor).not.toBeNull();
    expect(actor!.actorId).toBe('actor-1');
    expect(actor!.name).toBe('Gandalf');
  });

  it('clamps oversized actor names to the contract limit', () => {
    const actor = ActorCharacter.fromDocument({
      id: 'actor-1',
      name: 'n'.repeat(CHARACTER_NAME_MAX_LENGTH + 20),
    });

    expect(actor!.name).toHaveLength(CHARACTER_NAME_MAX_LENGTH);
  });

  it('returns null for malformed hook payloads', () => {
    expect(ActorCharacter.fromDocument(null)).toBeNull();
    expect(ActorCharacter.fromDocument({})).toBeNull();
    expect(ActorCharacter.fromDocument({ id: 42, name: 'Gandalf' })).toBeNull();
    expect(ActorCharacter.fromDocument({ id: 'actor-1' })).toBeNull();
  });
});
