import type { Character } from '@/services/Models/Character';
import type { NodeWithId } from 'v-network-graph';

export class CharacterNode implements NodeWithId {
  characterData: Character;
  id: string;
  name: string;

  constructor(character: Character) {
    this.characterData = character;
    this.id = character.id;
    this.name = character.name;
  }

  updateName(name: string) {
    this.characterData.name = name;
    this.name = name;
  }
}
