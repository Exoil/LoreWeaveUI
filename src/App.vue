<script setup lang="ts">
/**
 * Root screen: renders the character/relationship graph and hosts every modal
 * and context menu. Intentionally thin — graph styling, state, data and pointer
 * handling live in the `useGraph*` composables (see `.claude/rules/app-graph.md`).
 * This component just news up the API service, loads the initial data, holds the
 * modal open/close flags, and wires composables ↔ child components.
 */
import { ref, computed, onBeforeMount, onMounted, inject } from 'vue';
import { API_BASE_URL_KEY } from '@/foundry/injection-keys';
import { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { NotificationService } from '@/services/NotificationService';
import { PageQuery } from '@/services/Models/PageQuery';
import NotificationListComponent from '@/components/NotificationListComponent.vue';
import NodeContextMenuComponent from '@/components/menus/NodeContextMenuComponent.vue';
import FactNodeContextMenuComponent from '@/components/menus/FactNodeContextMenuComponent.vue';
import EdgeContextMenuComponent from '@/components/menus/EdgeContextMenuComponent.vue';
import ViewContextMenuComponent from '@/components/menus/ViewContextMenuComponent.vue';
import CreateCharacterComponent from '@/components/CreateCharacterComponent.vue';
import CreateCharacterKnowEdgeComponent from '@/components/CreateCharacterKnowEdgeComponent.vue';
import CreateFactComponent from '@/components/CreateFactComponent.vue';
import UpdateCharacterComponent from '@/components/UpdateCharacterComponent.vue';
import UpdateKnowEdgeComponent from '@/components/UpdateKnowEdgeComponent.vue';
import UpdateFactComponent from '@/components/UpdateFactComponent.vue';
import FindPathToCharacterComponent from '@/components/FindPathToCharacterComponent.vue';
import FactTooltipComponent from '@/components/FactTooltipComponent.vue';
import FactDetailsComponent from '@/components/FactDetailsComponent.vue';
import KnowEdgeDetailsComponent from '@/components/KnowEdgeDetailsComponent.vue';
import ConnectFactToCharacterComponent from '@/components/ConnectFactToCharacterComponent.vue';
import { useGraphConfiguration } from '@/composables/useGraphConfiguration';
import { useGraphSelection, EDGE_ID_SEPARATOR } from '@/composables/useGraphSelection';
import { useGraphData } from '@/composables/useGraphData';
import {
  useGraphInteractions,
  type NodeContextMenuApi,
  type FactNodeContextMenuApi,
  type EdgeContextMenuApi,
  type ViewContextMenuApi,
  type FactTooltipApi,
} from '@/composables/useGraphInteractions';

// --- Backend access -------------------------------------------------------
// Host injects the API base URL:
//  - Standalone SPA: '' (same-origin; nginx gateway proxies /v1/).
//  - Foundry module: absolute URL from the loreweaveui.apiBaseUrl world
//    setting (Foundry lives on :30000 and cannot serve /v1/).
const apiBaseUrl = inject(API_BASE_URL_KEY, '');
// Error toasts: the API service publishes every 4xx/5xx response here and the
// NotificationListComponent renders them (see src/services/NotificationService.ts).
const notificationService = new NotificationService();
let loreWeaveApiService: LoreWeaveApiService;

// --- Graph styling, state and behaviour (see src/composables) -------------
const { graphConfiguration } = useGraphConfiguration();
// The predicate closes over `graph` (created just below) lazily — it only runs
// on user interaction, long after both composables exist.
const selection = useGraphSelection({ isFactNodeId: (id) => graph.isFactNode(id) });
const graph = useGraphData(selection);

// Context-menu component instances, opened by the interaction handlers.
const nodeMenuRef = ref<NodeContextMenuApi | null>(null);
const factMenuRef = ref<FactNodeContextMenuApi | null>(null);
const edgeMenuRef = ref<EdgeContextMenuApi | null>(null);
const viewMenuRef = ref<ViewContextMenuApi | null>(null);
const factTooltipRef = ref<FactTooltipApi | null>(null);
const { eventHandlers } = useGraphInteractions(
  selection,
  {
    node: nodeMenuRef,
    factNode: factMenuRef,
    edge: edgeMenuRef,
    view: viewMenuRef,
    factTooltip: factTooltipRef,
  },
  { onFactNodeClicked: openFactDetailsDialog, onKnowEdgeClicked: openKnowEdgeDetailsDialog },
);

// Pull the refs/handlers the template uses out of the composables. Top-level
// refs are auto-unwrapped in the template, so the markup stays free of `.value`.
const {
  firstSelectedNodeId,
  secondSelectedNodeId,
  selectedFactNodeId,
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
  onFactCreated,
  onFactConnected,
  onFactUpdated,
  onFactDeleted,
  onFactEdgeDeleted,
  onPathFound,
  clearHighlightedPath,
} = graph;

// A fact edge points at a fact node; the edge menu shows different actions for it.
const selectedEdgeIsFactEdge = computed<boolean>(() =>
  selectedEdgeToId.value ? graph.isFactNode(selectedEdgeToId.value) : false,
);

onBeforeMount(() => {
  loreWeaveApiService = new LoreWeaveApiService(apiBaseUrl, notificationService);
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

const createFactDialogOpen = ref(false);
function openCreateFactDialog() {
  if (!firstSelectedNodeId.value) return;
  createFactDialogOpen.value = true;
}

const updateFactDialogOpen = ref(false);
function openUpdateFactDialog() {
  if (!selectedFactNodeId.value) return;
  updateFactDialogOpen.value = true;
}

// Connect the selected fact to one more character; already-connected
// characters are excluded from the search results.
const connectFactDialogOpen = ref(false);
const connectedCharacterIdsForSelectedFact = computed<string[]>(() =>
  selectedFactNodeId.value ? graph.getCharacterIdsConnectedToFact(selectedFactNodeId.value) : [],
);
function openConnectFactDialog() {
  if (!selectedFactNodeId.value) return;
  connectFactDialogOpen.value = true;
}

// Read-only fact window, opened by left-clicking a fact node (the interaction
// handler passes the clicked id; the selection is already set at that point).
const factDetailsDialogOpen = ref(false);
const selectedFact = computed(() =>
  selectedFactNodeId.value ? (graph.getFactById(selectedFactNodeId.value) ?? null) : null,
);
function openFactDetailsDialog(factId: string) {
  if (!graph.getFactById(factId)) return;
  factDetailsDialogOpen.value = true;
}

// Read-only relation window, opened by left-clicking a know edge. Fact edges
// have no know relation behind them, so the guard leaves the dialog closed.
const knowEdgeDetailsDialogOpen = ref(false);
const selectedKnowEdge = computed(() =>
  selectedEdgeId.value ? (graph.getKnowEdgeById(selectedEdgeId.value) ?? null) : null,
);
const selectedKnowEdgeFromName = computed(() =>
  selectedKnowEdge.value
    ? (graph.getCharacterNameById(selectedKnowEdge.value.source) ?? null)
    : null,
);
const selectedKnowEdgeToName = computed(() =>
  selectedKnowEdge.value
    ? (graph.getCharacterNameById(selectedKnowEdge.value.target) ?? null)
    : null,
);
function openKnowEdgeDetailsDialog(edgeId: string) {
  if (!graph.getKnowEdgeById(edgeId)) return;
  knowEdgeDetailsDialogOpen.value = true;
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
      @openCreateFactDialog="openCreateFactDialog"
      @deletedCharacterFromMenu="onCharacterDeleted"
    />
    <FactNodeContextMenuComponent
      ref="factMenuRef"
      :loreWeaveApiService="loreWeaveApiService"
      :selectedFactId="selectedFactNodeId"
      @openUpdateFactDialog="openUpdateFactDialog"
      @openConnectFactDialog="openConnectFactDialog"
      @deletedFactFromMenu="onFactDeleted"
    />
    <EdgeContextMenuComponent
      ref="edgeMenuRef"
      :loreWeaveApiService="loreWeaveApiService"
      :selectedEdgeId="selectedEdgeId"
      :edgeIdSeparator="EDGE_ID_SEPARATOR"
      :isFactEdge="selectedEdgeIsFactEdge"
      @openUpdateKnowEdgeDialog="openUpdateKnowEdgeDialog"
      @deleteKnowEdgeFromMenu="onEdgeKnowDeleted"
      @deleteFactEdgeFromMenu="onFactEdgeDeleted"
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

    <CreateFactComponent
      v-model:open="createFactDialogOpen"
      :loreWeaveApiService="loreWeaveApiService"
      :characterId="firstSelectedNodeId"
      @factCreated="onFactCreated"
    />

    <UpdateFactComponent
      v-model:open="updateFactDialogOpen"
      :loreWeaveApiService="loreWeaveApiService"
      :factId="selectedFactNodeId"
      @updatedFact="onFactUpdated"
    />

    <ConnectFactToCharacterComponent
      v-model:open="connectFactDialogOpen"
      :loreWeaveApiService="loreWeaveApiService"
      :factId="selectedFactNodeId"
      :connectedCharacterIds="connectedCharacterIdsForSelectedFact"
      @factConnected="onFactConnected"
    />

    <FactTooltipComponent ref="factTooltipRef" :getFactById="graph.getFactById" />

    <FactDetailsComponent v-model:open="factDetailsDialogOpen" :fact="selectedFact" />

    <KnowEdgeDetailsComponent
      v-model:open="knowEdgeDetailsDialogOpen"
      :edge="selectedKnowEdge"
      :fromCharacterName="selectedKnowEdgeFromName"
      :toCharacterName="selectedKnowEdgeToName"
    />

    <NotificationListComponent :notificationService="notificationService" />

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
