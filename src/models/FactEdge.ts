import type { Edge } from 'v-network-graph';

/**
 * UI edge for v-network-graph representing a HAS_FACT connection from a
 * character (`source`) to a fact (`target`). Unlike {@link KnowEdge} it carries
 * no properties of its own — the connection either exists or it doesn't.
 */
export class FactEdge implements Edge {
  source: string;
  target: string;

  constructor(characterId: string, factId: string) {
    this.source = characterId;
    this.target = factId;
  }
}
