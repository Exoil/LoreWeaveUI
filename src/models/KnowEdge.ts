import type { Edge } from 'v-network-graph';

export class KnowEdge implements Edge {
  source: string;
  target: string;

  constructor(source: string, target: string) {
    this.source = source;
    this.target = target;
  }
}
