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
