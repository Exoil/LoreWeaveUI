<script setup lang="ts">
/**
 * Root screen: renders the character/relationship graph and hosts every modal
 * and context menu. Intentionally thin — graph styling, state, data and pointer
 * handling live in the `useGraph*` composables (see `.claude/rules/app-graph.md`).
 * This component just news up the API service, loads the initial data, holds the
 * modal open/close flags, and wires composables ↔ child components.
 */
import { ref, onBeforeMount, onMounted, inject } from 'vue';
import { API_BASE_URL_KEY } from '@/foundry/injection-keys';
import { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { PageQuery } from '@/services/Models/PageQuery';
import NodeContextMenuComponent from '@/components/menus/NodeContextMenuComponent.vue';
import EdgeContextMenuComponent from '@/components/menus/EdgeContextMenuComponent.vue';
import ViewContextMenuComponent from '@/components/menus/ViewContextMenuComponent.vue';
import CreateCharacterComponent from '@/components/CreateCharacterComponent.vue';
import CreateCharacterKnowEdgeComponent from '@/components/CreateCharacterKnowEdgeComponent.vue';
import UpdateCharacterComponent from '@/components/UpdateCharacterComponent.vue';
import UpdateKnowEdgeComponent from '@/components/UpdateKnowEdgeComponent.vue';
import FindPathToCharacterComponent from '@/components/FindPathToCharacterComponent.vue';
import { useGraphConfiguration } from '@/composables/useGraphConfiguration';
import { useGraphSelection, EDGE_ID_SEPARATOR } from '@/composables/useGraphSelection';
import { useGraphData } from '@/composables/useGraphData';
import {
  useGraphInteractions,
  type NodeContextMenuApi,
  type EdgeContextMenuApi,
  type ViewContextMenuApi,
} from '@/composables/useGraphInteractions';

// --- Backend access -------------------------------------------------------
// Host injects the API base URL:
//  - Standalone SPA: '' (same-origin; nginx gateway proxies /v1/).
//  - Foundry module: absolute URL from the loreweaveui.apiBaseUrl world
//    setting (Foundry lives on :30000 and cannot serve /v1/).
const apiBaseUrl = inject(API_BASE_URL_KEY, '');
let loreWeaveApiService: LoreWeaveApiService;

// --- Graph styling, state and behaviour (see src/composables) -------------
const { graphConfiguration } = useGraphConfiguration();
const selection = useGraphSelection();
const graph = useGraphData(selection);

// Context-menu component instances, opened by the interaction handlers.
const nodeMenuRef = ref<NodeContextMenuApi | null>(null);
const edgeMenuRef = ref<EdgeContextMenuApi | null>(null);
const viewMenuRef = ref<ViewContextMenuApi | null>(null);
const { eventHandlers } = useGraphInteractions(selection, {
  node: nodeMenuRef,
  edge: edgeMenuRef,
  view: viewMenuRef,
});

// Pull the refs/handlers the template uses out of the composables. Top-level
// refs are auto-unwrapped in the template, so the markup stays free of `.value`.
const {
  firstSelectedNodeId,
  secondSelectedNodeId,
  selectedEdgeId,
  selectedEdgeFromId,
  selectedEdgeToId,
  selectedNodeIds,
  selectedEdgeIds,
} = selection;
const {
  nodesForGraph,
  edgesForGraph,
  pathCharacterIds,
  onCharacterCreated,
  onCharacterUpdated,
  onCharacterDeleted,
  onEdgeKnowCreated,
  onEdgeKnowDeleted,
  onKnowEdgeUpdated,
  onPathFound,
  clearHighlightedPath,
} = graph;

onBeforeMount(() => {
  loreWeaveApiService = new LoreWeaveApiService(apiBaseUrl);
});

onMounted(async () => {
  const controller = new AbortController();
  const pageQuery = new PageQuery(1, 10, 'name', 'Asc');
  const result = await loreWeaveApiService.getCharactersAsync(pageQuery, controller.signal);
  graph.loadData(result);
});

// --- Modal open/close state ----------------------------------------------
// Each `open*` guard refuses to open a dialog without the selection it needs.
const createDialogOpen = ref(false);
function openCreateDialog() {
  createDialogOpen.value = true;
}

const createKnowEdgeModalOpen = ref(false);
function openCreateKnowEdgeDialog() {
  if (!firstSelectedNodeId.value || !secondSelectedNodeId.value) return;
  createKnowEdgeModalOpen.value = true;
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
      :loreWeaveApiService="loreWeaveApiService"
      :firstSelectedCharacterId="firstSelectedNodeId"
      :secondSelectedCharacterId="secondSelectedNodeId"
      @openUpdateCharacterDialog="openUpdateDialog"
      @openFindPathDialog="openFindPathDialog"
      @openCreateKnowEdgeDialog="openCreateKnowEdgeDialog"
      @deletedCharacterFromMenu="onCharacterDeleted"
    />
    <EdgeContextMenuComponent
      ref="edgeMenuRef"
      :loreWeaveApiService="loreWeaveApiService"
      :selectedEdgeId="selectedEdgeId"
      :edgeIdSeparator="EDGE_ID_SEPARATOR"
      @openUpdateKnowEdgeDialog="openUpdateKnowEdgeDialog"
      @deleteKnowEdgeFromMenu="onEdgeKnowDeleted"
    />
    <ViewContextMenuComponent ref="viewMenuRef" @openCreateCharacterDialog="openCreateDialog" />

    <CreateCharacterComponent
      v-model:open="createDialogOpen"
      :loreWeaveApiService="loreWeaveApiService"
      @characterCreated="onCharacterCreated"
    />

    <UpdateCharacterComponent
      v-model:open="updateNodeCharacterNodeModal"
      :loreWeaveApiService="loreWeaveApiService"
      :characterId="firstSelectedNodeId"
      @updatedCharacter="onCharacterUpdated"
    />

    <CreateCharacterKnowEdgeComponent
      v-model:open="createKnowEdgeModalOpen"
      :loreWeaveApiService="loreWeaveApiService"
      :fromNodeId="firstSelectedNodeId"
      :targetNodeId="secondSelectedNodeId"
      @createKnowEdge="onEdgeKnowCreated"
    />

    <UpdateKnowEdgeComponent
      v-model:open="updateKnowEdgeModalOpen"
      :loreWeaveApiService="loreWeaveApiService"
      :fromCharacterId="selectedEdgeFromId"
      :toCharacterId="selectedEdgeToId"
      @updatedKnowEdge="onKnowEdgeUpdated"
    />

    <FindPathToCharacterComponent
      v-model:open="findPathDialogOpen"
      :loreWeaveApiService="loreWeaveApiService"
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
