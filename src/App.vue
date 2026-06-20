<script setup lang="ts">
import { ref, onBeforeMount, onMounted, computed, reactive, inject } from 'vue';
import { API_BASE_URL_KEY } from '@/foundry/injection-keys';
import { CharacterNode } from '@/models/CharacterNode';
import { KnowEdge } from '@/models/KnowEdge';
import { KnowRelation } from '@/services/Models/KnowRelation';
import * as vNG from 'v-network-graph';
import { RpgAssistantService } from '@/services/RpgAssistantService';
import { PageQuery } from '@/services/Models/PageQuery';
import { type EdgeEvent, type NodeEvent } from 'v-network-graph';
import type { VersionedCharacter } from '@/services/Models/VersionedCharacter';
import NodeContextMenuComponent from '@/components/menus/NodeContextMenuComponent.vue';
import EdgeContextMenuComponent from '@/components/menus/EdgeContextMenuComponent.vue';
import ViewContextMenuComponent from '@/components/menus/ViewContextMenuComponent.vue';
import CreateCharacterComponent from '@/components/CreateCharacterComponent.vue';
import UpdateCharacterComponent from '@/components/UpdateCharacterComponent.vue';
import UpdateKnowEdgeComponent from '@/components/UpdateKnowEdgeComponent.vue';
import FindPathToCharacterComponent from '@/components/FindPathToCharacterComponent.vue';
import type { Character } from '@/services/Models/Character.ts';
import type { VersionedKnowRelation } from '@/services/Models/VersionedKnowRelation';
import {
  type ForceEdgeDatum,
  ForceLayout,
  type ForceNodeDatum,
} from 'v-network-graph/lib/force-layout';

let rpgAssistantService: RpgAssistantService;
const viewMenuRef = ref<InstanceType<typeof ViewContextMenuComponent> | null>(null);
const nodeMenuRef = ref<InstanceType<typeof NodeContextMenuComponent> | null>(null);
const edgeMenuRef = ref<InstanceType<typeof EdgeContextMenuComponent> | null>(null);
const EdgeIdSeparator = '_';
const graphConfiguration = reactive(vNG.getFullConfigs());
const firstSelectedNodeId = ref<string | null>(null);
const secondSelectedNodeId = ref<string | null>(null);
const selectedEdgeId = ref<string | undefined>(undefined);
const suppressNextViewClickClear = ref(false);

// The selected edge id encodes its endpoints as `<from><sep><to>`; split it so
// the update-relation modal can address the relation by its character ids.
const selectedEdgeFromId = computed<string | null>(
  () => selectedEdgeId.value?.split(EdgeIdSeparator)[0] ?? null,
);
const selectedEdgeToId = computed<string | null>(
  () => selectedEdgeId.value?.split(EdgeIdSeparator)[1] ?? null,
);

const selectedNodeIds = computed<string[]>({
  get() {
    const selectedNodes = [];
    if (firstSelectedNodeId.value) {
      selectedNodes.push(firstSelectedNodeId.value);
    }
    if (secondSelectedNodeId.value) {
      selectedNodes.push(secondSelectedNodeId.value);
    }
    return selectedNodes;
  },
  set(ids) {
    const firstId = ids?.[0];
    const secondId = ids?.[1];
    if (firstId) {
      firstSelectedNodeId.value = firstId;
    }
    if (secondId) {
      secondSelectedNodeId.value = secondId;
    }
  },
});

const selectedEdgeIds = computed<string[]>({
  get() {
    return selectedEdgeId.value ? [selectedEdgeId.value] : [];
  },
  set(ids) {
    const next = ids?.[0];
    if (!next) {
      return;
    }
    selectedEdgeId.value = next;
  },
});

const pathCharacterIds = ref<string[]>([]);

const highlightedNodeIds = computed<Set<string>>(() => new Set(pathCharacterIds.value));

const highlightedEdgeKeys = computed<Set<string>>(() => {
  const keys = new Set<string>();
  for (let i = 0; i < pathCharacterIds.value.length - 1; i++) {
    keys.add(pathCharacterIds.value[i]! + EdgeIdSeparator + pathCharacterIds.value[i + 1]!);
  }
  return keys;
});

const nodeList = ref<CharacterNode[]>([]);
const nodesForGraph = computed<vNG.Nodes>(() =>
  Object.fromEntries(
    nodeList.value.map((n) => [
      n.id,
      {
        name: n.name,
        highlighted: highlightedNodeIds.value.has(n.id),
        isFirstSelected: firstSelectedNodeId.value === n.id,
        isSecondSelected: secondSelectedNodeId.value === n.id,
      },
    ]),
  ),
);
// Edge labels only show the opening of the description so long relation notes
// don't overflow the graph; the full text lives on the relation itself.
const DESCRIPTION_LABEL_MAX_LENGTH = 20;
function truncateDescription(description: string): string {
  if (description.length <= DESCRIPTION_LABEL_MAX_LENGTH) return description;
  return description.slice(0, DESCRIPTION_LABEL_MAX_LENGTH) + '…';
}

const edges = ref<KnowEdge[]>([]);
const edgesForGraph = computed<vNG.Edges>(() =>
  Object.fromEntries(
    edges.value.map((e) => {
      const key = e.source + EdgeIdSeparator + e.target;
      const first = firstSelectedNodeId.value;
      const second = secondSelectedNodeId.value;
      const connectsSelected =
        !!first &&
        !!second &&
        ((e.source === first && e.target === second) ||
          (e.source === second && e.target === first));
      return [
        key,
        {
          source: e.source,
          target: e.target,
          highlighted: highlightedEdgeKeys.value.has(key),
          connectsSelected,
          isStrong: e.isStrongRelation,
          label: truncateDescription(e.description),
        },
      ];
    }),
  ),
);

// Host injects the API base URL:
//  - Standalone SPA: '' (same-origin; nginx gateway proxies /v1/).
//  - Foundry module: absolute URL from the loreweaveui.apiBaseUrl world
//    setting (Foundry lives on :30000 and cannot serve /v1/).
const apiBaseUrl = inject(API_BASE_URL_KEY, '');

onBeforeMount(() => {
  rpgAssistantService = new RpgAssistantService(apiBaseUrl);
  setupGraphConfig();
});

function loadData(result: Character[]) {
  nodeList.value = result.map((c) => new CharacterNode(c));
  nodeList.value.forEach((n) => {
    n.characterData.knowCharacters.forEach((relation) => {
      edges.value.push(
        new KnowEdge(n.id, relation.characterId, relation.description, relation.isStrongRelation),
      );
    });
  });
}

onMounted(async () => {
  const controller = new AbortController();
  const signal = controller.signal;
  const pageQuery = new PageQuery(1, 10, 'name', 'Asc');
  const result = await rpgAssistantService.getCharactersAsync(pageQuery, signal);
  loadData(result);
});

const PATH_HIGHLIGHT_COLOR = '#a855f7';
const DEFAULT_NODE_COLOR = '#4466cc';
const DEFAULT_EDGE_COLOR = '#aaaaaa';
const FIRST_SELECTED_STROKE_COLOR = '#16a34a';
const SECOND_SELECTED_STROKE_COLOR = '#14532d';
const SELECTED_PAIR_EDGE_COLOR = '#22c55e';
const SELECTED_STROKE_WIDTH = 4;
const WEAK_EDGE_DASHARRAY = '6 4';

function setupGraphConfig() {
  graphConfiguration.node.selectable = 2;
  graphConfiguration.node.focusring.visible = false;
  graphConfiguration.node.normal.color = (node) =>
    node.highlighted ? PATH_HIGHLIGHT_COLOR : DEFAULT_NODE_COLOR;
  graphConfiguration.node.normal.strokeWidth = (node) =>
    node.isFirstSelected || node.isSecondSelected ? SELECTED_STROKE_WIDTH : 0;
  graphConfiguration.node.normal.strokeColor = (node) => {
    if (node.isSecondSelected) return SECOND_SELECTED_STROKE_COLOR;
    if (node.isFirstSelected) return FIRST_SELECTED_STROKE_COLOR;
    return undefined;
  };
  graphConfiguration.edge.selectable = 1;
  graphConfiguration.edge.normal.color = (edge) => {
    if (edge.connectsSelected) return SELECTED_PAIR_EDGE_COLOR;
    if (edge.highlighted) return PATH_HIGHLIGHT_COLOR;
    return DEFAULT_EDGE_COLOR;
  };
  graphConfiguration.edge.normal.width = (edge) =>
    edge.connectsSelected || edge.highlighted ? 3 : 1;
  // Weak relations render as a dashed line; strong relations stay solid.
  graphConfiguration.edge.normal.dasharray = (edge) =>
    edge.isStrong ? undefined : WEAK_EDGE_DASHARRAY;
  graphConfiguration.edge.type = 'straight';
  graphConfiguration.edge.marker.source.type = 'none';
  graphConfiguration.edge.marker.target.type = 'arrow';
  graphConfiguration.view.grid.visible = true;
  graphConfiguration.view.grid.interval = 10;
  graphConfiguration.view.grid.thickIncrements = 5;
  graphConfiguration.view.grid.line.color = '#e0e0e0';
  graphConfiguration.view.grid.line.width = 1;
  graphConfiguration.view.grid.line.dasharray = 1;
  graphConfiguration.view.grid.thick.color = '#cccccc';
  graphConfiguration.view.grid.thick.width = 1;
  graphConfiguration.view.grid.thick.dasharray = 0;
  graphConfiguration.view.layoutHandler = new ForceLayout({
    positionFixedByDrag: true, // lock node after dragging
    positionFixedByClickWithAltKey: true,
    createSimulation: (d3, nodes, edges) => {
      const forceLink = d3
        .forceLink<ForceNodeDatum, ForceEdgeDatum>(edges)
        .id((d: { id: string }) => d.id);

      /**
       * Controls the ideal length and stiffness of edges between connected nodes.
       * - distance: target edge length in pixels
       * - strength: how hard the spring pulls nodes to that distance (0–1)
       */
      const createEdgeSpringForce = (distance: number, strength: number) =>
        forceLink.distance(distance).strength(strength);

      /**
       * Makes every node repel every other node, like same-pole magnets.
       * Use negative values for repulsion — the larger the absolute value, the more spread out nodes become.
       */
      const createNodeRepulsionForce = (strength: number) => d3.forceManyBody().strength(strength);

      /**
       * Pulls all nodes gently toward the center of the viewport.
       * Keep strength low (e.g. 0.05) so it doesn't fight other forces.
       */
      const createCenteringForce = (strength: number) => d3.forceCenter().strength(strength);

      /**
       * Prevents nodes from overlapping by enforcing a minimum distance between node centers.
       * - radius: minimum distance in pixels (should be >= your node's visual radius)
       */
      const createCollisionForce = (radius: number) => d3.forceCollide(radius);

      return (
        d3
          .forceSimulation(nodes)
          .force('edge', createEdgeSpringForce(120, 0.5))
          .force('charge', createNodeRepulsionForce(-200))
          .force('center', createCenteringForce(0.05))
          .force('collide', createCollisionForce(60))
          /**
           * alphaMin: the cooling threshold at which the simulation stops.
           * Alpha starts at 1.0 and decays each tick toward this value.
           * Lower = runs longer and settles more accurately.
           * Higher = stops sooner (faster but less precise layout).
           */
          .alphaMin(0.001)
      );
    },
  });
  graphConfiguration.edge.keepOrder = 'clock';
}

const createDialogOpen = ref(false);
function openCreateDialog() {
  createDialogOpen.value = true;
}

const updateNodeCharacterNodeModal = ref(false);

function openUpdateDialog() {
  if (!firstSelectedNodeId.value) return;
  updateNodeCharacterNodeModal.value = true;
}

const updateKnowEdgeModalOpen = ref(false);

function openUpdateKnowEdgeDialog() {
  if (!selectedEdgeFromId.value || !selectedEdgeToId.value) return;
  updateKnowEdgeModalOpen.value = true;
}

const findPathDialogOpen = ref(false);

function openFindPathDialog() {
  if (!firstSelectedNodeId.value) return;
  findPathDialogOpen.value = true;
}

function onPathFound(characterIds: string[]) {
  pathCharacterIds.value = characterIds;
}

function clearHighlightedPath() {
  pathCharacterIds.value = [];
}

function onCharacterCreated(node: CharacterNode) {
  nodeList.value.push(node);
  firstSelectedNodeId.value = node.id;
}

function onCharacterDeleted(id: string) {
  const idx = nodeList.value.findIndex((n) => n.id === id);
  if (idx === -1) return;
  nodeList.value.splice(idx, 1);
}

function onCharacterUpdated(updatedCharacter: VersionedCharacter) {
  const idx = nodeList.value.findIndex((n) => n.id === updatedCharacter.id);
  if (idx === -1) return;
  nodeList.value[idx]!.characterData.id = updatedCharacter.id;
  nodeList.value[idx]!.updateName(updatedCharacter.name);
}

function onEdgeKnowDeleted(deletedEdgeId: string) {
  const [fromId, toId] = deletedEdgeId.split(EdgeIdSeparator);
  const idx = edges.value.findIndex((n) => n.source === fromId && n.target === toId);
  if (idx === -1) return;
  edges.value.splice(idx, 1);
}

function onEdgeKnowCreated(edge: KnowEdge) {
  const foundNodeIndex = nodeList.value.findIndex((n) => n.id === edge.source);
  if (foundNodeIndex === -1) return;
  nodeList.value[foundNodeIndex]!.characterData.knowCharacters.push(
    new KnowRelation(edge.target, edge.description, edge.isStrongRelation),
  );
  edges.value.push(edge);
}

function onKnowEdgeUpdated(relation: VersionedKnowRelation) {
  const edge = edges.value.find(
    (e) => e.source === relation.fromCharacterId && e.target === relation.toCharacterId,
  );
  if (edge) {
    edge.description = relation.description;
    edge.isStrongRelation = relation.isStrongRelation;
  }

  const node = nodeList.value.find((n) => n.id === relation.fromCharacterId);
  const knowRelation = node?.characterData.knowCharacters.find(
    (k) => k.characterId === relation.toCharacterId,
  );
  if (knowRelation) {
    knowRelation.description = relation.description;
    knowRelation.isStrongRelation = relation.isStrongRelation;
  }
}

// --- Event handlers --- //
function nodeClickHandler(nodeEvents: NodeEvent<MouseEvent>) {
  suppressNextViewClickClear.value = true;
  firstSelectedNodeId.value = nodeEvents.node;
}

function edgeClickHandler(edgeEvent: EdgeEvent<MouseEvent>) {
  suppressNextViewClickClear.value = true;
  selectedEdgeId.value = edgeEvent.edge;
}

function viewClickHandler() {
  if (suppressNextViewClickClear.value) {
    suppressNextViewClickClear.value = false;
    return;
  }
  selectedEdgeId.value = undefined;
  firstSelectedNodeId.value = null;
  secondSelectedNodeId.value = null;
}

function showNodeContextMenu(params: NodeEvent<MouseEvent>) {
  suppressNextViewClickClear.value = true;
  const clickedId = params.node;

  if (!firstSelectedNodeId.value) {
    firstSelectedNodeId.value = clickedId;
  } else if (firstSelectedNodeId.value === clickedId) {
  } else if (!secondSelectedNodeId.value) {
    secondSelectedNodeId.value = clickedId;
  } else if (secondSelectedNodeId.value === clickedId) {
  } else {
    secondSelectedNodeId.value = clickedId;
  }

  nodeMenuRef.value?.showNodeContextMenu(params);
}

function showEdgeContextMenu(params: EdgeEvent<MouseEvent>) {
  suppressNextViewClickClear.value = true;
  const clickedEdgeId = params.edge;
  if (!clickedEdgeId) {
    return;
  }
  selectedEdgeId.value = clickedEdgeId;
  edgeMenuRef.value?.showEdgeContextMenu(params);
}

function showViewContextMenu(params: vNG.ViewEvent<MouseEvent>) {
  suppressNextViewClickClear.value = true;
  viewMenuRef.value?.showViewContextMenu(params);
}

const eventHandlers: vNG.EventHandlers = {
  'node:click': nodeClickHandler,
  'edge:click': edgeClickHandler,
  'view:click': viewClickHandler,
  'node:contextmenu': showNodeContextMenu,
  'edge:contextmenu': showEdgeContextMenu,
  'view:contextmenu': showViewContextMenu,
};
</script>

<template>
  <div class="app">
    <v-network-graph
      class="graph-host"
      :nodes="nodesForGraph"
      :edges="edgesForGraph"
      :configs="graphConfiguration"
      :event-handlers="eventHandlers"
      v-model:selected-nodes="selectedNodeIds"
      v-model:selected-edges="selectedEdgeIds"
    >
      <template #edge-label="{ edge, ...slotProps }">
        <v-edge-label
          :text="edge.label"
          align="center"
          vertical-align="above"
          fill="#374151"
          :font-size="11"
          v-bind="slotProps"
        />
      </template>
    </v-network-graph>
    <NodeContextMenuComponent
      ref="nodeMenuRef"
      :rpgAssistantService="rpgAssistantService"
      :firstSelectedCharacterId="firstSelectedNodeId"
      :secondSelectedCharacterId="secondSelectedNodeId"
      @openUpdateCharacterDialog="openUpdateDialog"
      @openFindPathDialog="openFindPathDialog"
      @deletedCharacterFromMenu="onCharacterDeleted"
      @createKnowEdgeFromMenu="onEdgeKnowCreated"
    />
    <EdgeContextMenuComponent
      ref="edgeMenuRef"
      :rpgAssistantService="rpgAssistantService"
      :selectedEdgeId="selectedEdgeId"
      :edgeIdSeparator="EdgeIdSeparator"
      @openUpdateKnowEdgeDialog="openUpdateKnowEdgeDialog"
      @deleteKnowEdgeFromMenu="onEdgeKnowDeleted"
    />
    <ViewContextMenuComponent ref="viewMenuRef" @openCreateCharacterDialog="openCreateDialog" />

    <CreateCharacterComponent
      v-model:open="createDialogOpen"
      :rpgAssistantService="rpgAssistantService"
      @characterCreated="onCharacterCreated"
    />

    <UpdateCharacterComponent
      v-model:open="updateNodeCharacterNodeModal"
      :rpgAssistantService="rpgAssistantService"
      :characterId="firstSelectedNodeId"
      @updatedCharacter="onCharacterUpdated"
    />

    <UpdateKnowEdgeComponent
      v-model:open="updateKnowEdgeModalOpen"
      :rpgAssistantService="rpgAssistantService"
      :fromCharacterId="selectedEdgeFromId"
      :toCharacterId="selectedEdgeToId"
      @updatedKnowEdge="onKnowEdgeUpdated"
    />

    <FindPathToCharacterComponent
      v-model:open="findPathDialogOpen"
      :rpgAssistantService="rpgAssistantService"
      :fromCharacterId="firstSelectedNodeId"
      @pathFound="onPathFound"
    />

    <button
      v-if="pathCharacterIds.length > 0"
      id="clear-highlighted-path-button"
      class="button is-warning clear-path-button"
      type="button"
      @click="clearHighlightedPath"
    >
      Clear path
    </button>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  /* When hosted inside a Foundry ApplicationV2 window the parent already
     constrains height; 100vh would overflow the window. 100% lets the
     window's resize handle drive the layout. Standalone SPA gets the same
     value because index.html sets html, body, #app to 100%. */
  height: 100%;
  min-height: 480px;
  position: relative;
}

.graph-host {
  flex: 1;
  background: #ffffff;
}

.clear-path-button {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  z-index: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
