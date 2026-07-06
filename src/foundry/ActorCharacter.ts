import { CHARACTER_NAME_MAX_LENGTH, clampToLength } from '@/services/Models/ValidationRules';
import { readDocumentIdentity } from './DocumentIdentity';

/**
 * A Foundry actor (character sheet) viewed as a graph-character payload:
 * the actor's id for the document↔backend links, and its name already
 * fitted to the backend contract (1..50 chars) — an oversized Foundry name
 * must never make the sync 400.
 */
export class ActorCharacter {
  private constructor(
    /** Foundry actor id (the `documentLinks.actors` key). */
    public readonly actorId: string,
    /** Character name, clamped to the contract limit. */
    public readonly name: string,
  ) {}

  /** Build from an untyped `createActor`/`updateActor`/`deleteActor` hook document, or null. */
  static fromDocument(doc: unknown): ActorCharacter | null {
    const identity = readDocumentIdentity(doc);
    if (!identity) return null;
    return new ActorCharacter(identity.id, clampToLength(identity.name, CHARACTER_NAME_MAX_LENGTH));
  }
}
