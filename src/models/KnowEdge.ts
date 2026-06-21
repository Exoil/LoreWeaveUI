import type { Edge } from 'v-network-graph';

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
