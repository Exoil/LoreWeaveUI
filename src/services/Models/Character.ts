import { KnowRelation } from './KnowRelation';
import { Fact } from './Fact';

/**
 * A character and the relations they know about, as consumed by the UI.
 * `knowCharacters` holds the outgoing "knows" relations (see {@link KnowRelation});
 * `facts` holds the facts connected via HAS_FACT (see {@link Fact}).
 */
export class Character {
  public id: string;
  public name: string;
  public knowCharacters: KnowRelation[];
  public facts: Fact[];

  constructor(id: string, name: string, knowCharacters: KnowRelation[] = [], facts: Fact[] = []) {
    this.id = id;
    this.name = name;
    this.knowCharacters = knowCharacters;
    this.facts = facts;
  }
}
