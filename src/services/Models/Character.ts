export class Character {
  public id: string;
  public name: string;
  public knowCharacterIds: string[];

  constructor(id: string, name: string, knowCharacterIds: string[] = []) {
    this.id = id;
    this.name = name;
    this.knowCharacterIds = knowCharacterIds;
  }
}
