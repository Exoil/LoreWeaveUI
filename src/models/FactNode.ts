import type { Fact } from '@/services/Models/Fact';
import type { NodeWithId } from 'v-network-graph';
import type { GraphElement } from './GraphElement';

/**
 * UI wrapper around a backend {@link Fact} that satisfies v-network-graph's
 * `NodeWithId` (which needs flat `id` / `name` fields). The full model is kept
 * on `factData`; the duplicated `id`/`name` (the fact's title) are what the
 * graph actually reads.
 */
export class FactNode implements NodeWithId, GraphElement {
  factData: Fact;
  id: string;
  name: string;

  constructor(fact: Fact) {
    this.factData = fact;
    this.id = fact.id;
    this.name = fact.title;
  }

  /** Stable identity shared with edges (see {@link GraphElement}): the fact id. */
  get key(): string {
    return this.id;
  }

  /** Edit the fact, updating the node label and the wrapped `factData`. */
  updateFact(title: string, content: string) {
    this.factData.title = title;
    this.factData.content = content;
    this.name = title;
  }
}
