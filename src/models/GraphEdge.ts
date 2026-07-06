import type { Edge } from 'v-network-graph';
import type { GraphElement } from './GraphElement';

/**
 * Separator used to encode an edge key as `<fromId><sep><toId>`.
 * The graph identifies an edge by a single string, so the two endpoint ids
 * are joined with this separator and split back out when an edge needs to be
 * addressed by its from/to ids.
 */
export const EDGE_ID_SEPARATOR = '_';

/** Compose the stable edge key for the given endpoints. */
export function buildEdgeKey(source: string, target: string): string {
  return source + EDGE_ID_SEPARATOR + target;
}

/**
 * Base class for graph edges ({@link KnowEdge}, {@link FactEdge}): the
 * `source`/`target` endpoints v-network-graph needs, plus the shared
 * {@link GraphElement} identity so edges and nodes can be hidden, selected
 * and looked up through one `key`.
 */
export abstract class GraphEdge implements Edge, GraphElement {
  source: string;
  target: string;

  constructor(source: string, target: string) {
    this.source = source;
    this.target = target;
  }

  /** Stable identity: the endpoints joined with {@link EDGE_ID_SEPARATOR}. */
  get key(): string {
    return buildEdgeKey(this.source, this.target);
  }
}
