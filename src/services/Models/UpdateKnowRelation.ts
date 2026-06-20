export class UpdateKnowRelation {
  public fromCharacterId: string;
  public toCharacterId: string;
  public description: string;
  public isStrongRelation: boolean;
  public version: number;

  constructor(
    fromCharacterId: string,
    toCharacterId: string,
    description: string,
    isStrongRelation: boolean,
    version: number,
  ) {
    this.fromCharacterId = fromCharacterId;
    this.toCharacterId = toCharacterId;
    this.description = description;
    this.isStrongRelation = isStrongRelation;
    this.version = version;
  }
}
