/**
 * Payload to edit a relation's `description` / `isStrongRelation`. `version` is
 * the relation's ETag, sent for an optimistic-concurrency check on the backend.
 */
export class UpdateKnowRelation {
  public fromCharacterId: string;
  public toCharacterId: string;
  public description: string;
  public isStrongRelation: boolean;
  public version: string;

  constructor(
    fromCharacterId: string,
    toCharacterId: string,
    description: string,
    isStrongRelation: boolean,
    version: string,
  ) {
    this.fromCharacterId = fromCharacterId;
    this.toCharacterId = toCharacterId;
    this.description = description;
    this.isStrongRelation = isStrongRelation;
    this.version = version;
  }
}
