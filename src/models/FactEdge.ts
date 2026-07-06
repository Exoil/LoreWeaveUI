import { GraphEdge } from './GraphEdge';

/**
 * UI edge for v-network-graph representing a HAS_FACT connection from a
 * character (`source`) to a fact (`target`). Unlike {@link KnowEdge} it carries
 * no properties of its own — the connection either exists or it doesn't.
 */
export class FactEdge extends GraphEdge {
  constructor(characterId: string, factId: string) {
    super(characterId, factId);
  }
}
