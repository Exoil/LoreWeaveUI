import { KnowRelation } from './KnowRelation';

export class Character {
  public id: string;
  public name: string;
  public knowCharacters: KnowRelation[];

  constructor(id: string, name: string, knowCharacters: KnowRelation[] = []) {
    this.id = id;
    this.name = name;
    this.knowCharacters = knowCharacters;
  }
}
