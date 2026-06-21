/**
 * A directed "knows" relation pointing at the character `characterId`, with a
 * free-text `description` and a strength flag (`isStrongRelation` → solid edge,
 * otherwise a weak/dashed edge).
 */
export class KnowRelation {
  public characterId: string;
  public description: string;
  public isStrongRelation: boolean;

  constructor(characterId: string, description = '', isStrongRelation = false) {
    this.characterId = characterId;
    this.description = description;
    this.isStrongRelation = isStrongRelation;
  }
}
