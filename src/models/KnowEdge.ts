import type { Edge } from 'v-network-graph';

/**
 * UI edge for v-network-graph representing a "knows" relation from `source` to
 * `target`. `isStrongRelation` drives the rendering (solid line when strong,
 * dashed when weak); `description` is shown as the (truncated) edge label.
 */
export class KnowEdge implements Edge {
  source: string;
  target: string;
  description: string;
  isStrongRelation: boolean;

  constructor(source: string, target: string, description = '', isStrongRelation = false) {
    this.source = source;
    this.target = target;
    this.description = description;
    this.isStrongRelation = isStrongRelation;
  }
}
