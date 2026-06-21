import type { Character } from '@/services/Models/Character';
import type { NodeWithId } from 'v-network-graph';

/**
 * UI wrapper around a backend {@link Character} that satisfies v-network-graph's
 * `NodeWithId` (which needs flat `id` / `name` fields). The full model is kept on
 * `characterData` so relation edits stay in sync; the duplicated `id`/`name` are
 * what the graph actually reads.
 */
export class CharacterNode implements NodeWithId {
  characterData: Character;
  id: string;
  name: string;

  constructor(character: Character) {
    this.characterData = character;
    this.id = character.id;
    this.name = character.name;
  }

  /** Rename the character, updating both `name` and the wrapped `characterData`. */
  updateName(name: string) {
    this.characterData.name = name;
    this.name = name;
  }
}
