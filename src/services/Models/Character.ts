import { KnowRelation } from './KnowRelation';

/**
 * A character and the relations they know about, as consumed by the UI.
 * `knowCharacters` holds the outgoing "knows" relations (see {@link KnowRelation}).
 */
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
