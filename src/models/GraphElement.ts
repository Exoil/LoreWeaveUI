/**
 * Common identity shared by everything rendered on the graph — character and
 * fact nodes, relation and fact edges. The `key` is the stable string the app
 * uses wherever an element must be addressed uniformly regardless of its kind:
 * the GM's hidden-items store, selection, and the v-network-graph projections.
 *
 * Nodes use their domain id as the key; edges encode their endpoints (see
 * {@link GraphEdge}). The two never collide: node ids are backend ids, edge
 * keys always contain the separator.
 */
export interface GraphElement {
  readonly key: string;
}
