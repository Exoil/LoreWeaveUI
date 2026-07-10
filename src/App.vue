<script setup lang="ts">
/**
 * Root screen: renders the character/relationship graph and hosts every modal
 * and context menu. Intentionally thin — graph styling, state, data and pointer
 * handling live in the `useGraph*` composables (see `.claude/rules/app-graph.md`).
 * This component just news up the API service, loads the initial data, holds the
 * modal open/close flags, and wires composables ↔ child components.
 */
import { ref, shallowRef, computed, onBeforeMount, onMounted, onBeforeUnmount, inject } from 'vue';
import {
  API_BASE_URL_KEY,
  BOARD_RESOLVER_KEY,
  GRAPH_LAYOUT_STORAGE_KEY,
  GRAPH_LAYOUT_SYNC_KEY,
  GRAPH_REFRESH_KEY,
  GRAPH_VISIBILITY_HOST_KEY,
  LINKED_DOCUMENT_UPDATER_KEY,
  SYSTEM_CHARACTER_ID_KEY,
  type GraphDataChange,
} from '@/foundry/injection-keys';
import { MODULE_ID } from '@/foundry/constants';
import { isStandalone } from '@/env';
import { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { NotificationService } from '@/services/NotificationService';
import { Fact } from '@/services/Models/Fact';
import type { BoardConfiguration } from '@/services/Models/BoardConfiguration';
import type { VersionedBoard } from '@/services/Models/VersionedBoard';
import type { VersionedCharacter } from '@/services/Models/VersionedCharacter';
import type { VersionedFact } from '@/services/Models/VersionedFact';
import NotificationListComponent from '@/components/NotificationListComponent.vue';
import GraphLegendComponent from '@/components/GraphLegendComponent.vue';
import HelpManualComponent from '@/components/HelpManualComponent.vue';
import BoardSettingsComponent from '@/components/BoardSettingsComponent.vue';
import SelectBoardComponent from '@/components/SelectBoardComponent.vue';
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
import {
  useGraphLayoutCache,
  createLocalStorageGraphLayoutStorage,
} from '@/composables/useGraphLayoutCache';
import { useGraphSelection, EDGE_ID_SEPARATOR } from '@/composables/useGraphSelection';
import { useGraphData } from '@/composables/useGraphData';
import {
  useGraphVisibility,
  createLocalStorageGraphVisibilityHost,
} from '@/composables/useGraphVisibility';
import { useGraphLayoutSync } from '@/composables/useGraphLayoutSync';
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
// GM-hidden nodes/edges + the user's role: the Foundry host injects a
// world-setting-backed host (GM-writable, live-synced to players); standalone
// falls back to localStorage with the user treated as GM.
const visibilityHost = inject(
  GRAPH_VISIBILITY_HOST_KEY,
  () => createLocalStorageGraphVisibilityHost(`${MODULE_ID}:hidden-graph-items`),
  true,
);
const visibility = useGraphVisibility(visibilityHost);

// --- Active board -----------------------------------------------------------
// One board per RPG game; every data request is scoped to it. Foundry injects
// a world-correlated resolver (the user never picks a board there); the
// standalone SPA falls back to the picker modal, remembering the last choice.
const boardResolver = inject(BOARD_RESOLVER_KEY, null);
const activeBoard = shallowRef<VersionedBoard | null>(null);
const activeBoardConfiguration = computed<BoardConfiguration | null>(
  () => activeBoard.value?.configuration ?? null,
);

// Players are view-only: no node dragging (the GM's layout is synced to them).
// `palette` is the effective per-board colour set; the legend renders from it.
const { graphConfiguration, palette } = useGraphConfiguration({
  canEditLayout: visibility.isGameMaster,
  boardConfiguration: activeBoardConfiguration,
});

// Node positions survive close/reopen: the Foundry host injects a
// game.settings-backed storage; standalone falls back to localStorage.
// Restored nodes come back pinned exactly where the user left them.
const layoutStorage = inject(
  GRAPH_LAYOUT_STORAGE_KEY,
  () => createLocalStorageGraphLayoutStorage(`${MODULE_ID}:graph-layout`),
  true,
);
const { layouts } = useGraphLayoutCache(layoutStorage);

// Live layout sync over the Foundry socket: the GM broadcasts after each drag
// (wired to `node:dragend` below), players apply what arrives. Standalone SPA
// has no other clients — the injected channel is null and sync is off.
const layoutSyncChannel = inject(GRAPH_LAYOUT_SYNC_KEY, null);
const { broadcastLayouts } = useGraphLayoutSync(
  layouts,
  layoutSyncChannel,
  visibility.isGameMaster,
);

// The predicate closes over `graph` (created just below) lazily — it only runs
// on user interaction, long after both composables exist.
const selection = useGraphSelection({ isFactNodeId: (id) => graph.isFactNode(id) });
const graph = useGraphData(selection, visibility);

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
  {
    onFactNodeDoubleClicked: openFactDetailsDialog,
    onKnowEdgeDoubleClicked: openKnowEdgeDetailsDialog,
    onNodeDragEnd: broadcastLayouts,
  },
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

// --- Graph → Foundry mirroring ---------------------------------------------
// Graph-side edits flow back onto the linked Foundry documents (rename the
// actor, update the handout). Strictly link-gated: graph-only characters and
// facts never touch Foundry. Standalone SPA: null → no mirroring.
const linkedDocumentUpdater = inject(LINKED_DOCUMENT_UPDATER_KEY, null);
function onCharacterUpdatedInDialog(character: VersionedCharacter) {
  onCharacterUpdated(character);
  linkedDocumentUpdater?.renameLinkedActor(character.id, character.name);
}
function onFactUpdatedInDialog(fact: VersionedFact) {
  onFactUpdated(fact);
  linkedDocumentUpdater?.updateLinkedJournal(fact.id, fact.title, fact.content);
}

// --- GM hide/show (context-menu wiring) ------------------------------------
// Hidden flags for whatever is currently selected drive the menu labels
// ("Hide from players" / "Show for players"); the toggles flip persistence.
const selectedCharacterIsHidden = computed<boolean>(() =>
  firstSelectedNodeId.value ? visibility.isHidden(firstSelectedNodeId.value) : false,
);
// The hidden system character anchors handout-facts (see foundry/
// document-sync) — deleting, renaming or revealing it would break that
// contract, so its node menu disables those actions.
const getSystemCharacterId = inject(SYSTEM_CHARACTER_ID_KEY, () => '');
const selectedCharacterIsProtected = computed<boolean>(() => {
  const systemCharacterId = getSystemCharacterId();
  return !!systemCharacterId && firstSelectedNodeId.value === systemCharacterId;
});
const selectedFactIsHidden = computed<boolean>(() =>
  selectedFactNodeId.value ? visibility.isHidden(selectedFactNodeId.value) : false,
);
const selectedEdgeIsHidden = computed<boolean>(() =>
  selectedEdgeId.value ? visibility.isHidden(selectedEdgeId.value) : false,
);
// An edge with a hidden endpoint is hidden *by the node* — its own toggle
// would do nothing, so the menu disables it instead of offering a lie.
const selectedEdgeIsHiddenViaNode = computed<boolean>(
  () =>
    (selectedEdgeFromId.value ? visibility.isHidden(selectedEdgeFromId.value) : false) ||
    (selectedEdgeToId.value ? visibility.isHidden(selectedEdgeToId.value) : false),
);
function toggleSelectedCharacterVisibility() {
  if (!firstSelectedNodeId.value || selectedCharacterIsProtected.value) return;
  visibility.toggleVisibility(firstSelectedNodeId.value);
}
function toggleSelectedFactVisibility() {
  if (!selectedFactNodeId.value) return;
  visibility.toggleVisibility(selectedFactNodeId.value);
}
function toggleSelectedEdgeVisibility() {
  if (!selectedEdgeId.value) return;
  visibility.toggleVisibility(selectedEdgeId.value);
}

onBeforeMount(() => {
  loreWeaveApiService = new LoreWeaveApiService(apiBaseUrl, notificationService);
});

// Initial load + follow-up whenever the host signals the backend data changed
// (the GM's client synced a Foundry actor/journal — see foundry/document-sync).
// Character changes carry a descriptor and are applied with one targeted
// fetch; anything else falls back to reloading the whole graph.
const graphRefreshSource = inject(GRAPH_REFRESH_KEY, null);
let loadController: AbortController | null = null;
let unsubscribeGraphRefresh: (() => void) | null = null;

async function loadGraphData() {
  loadController?.abort();
  loadController = new AbortController();
  try {
    const result = await loreWeaveApiService.getAllCharactersAsync(loadController.signal);
    graph.loadData(result);
  } catch (error) {
    // A newer refresh aborted this one — the newer request owns the graph.
    if (error instanceof Error && error.name === 'CanceledError') return;
    throw error;
  }
}

async function applyExternalGraphChange(change: GraphDataChange | null) {
  if (!change) {
    await loadGraphData();
    return;
  }
  try {
    if (change.kind === 'character') {
      if (change.action === 'deleted') {
        graph.onCharacterDeleted(change.characterId);
        return;
      }
      // created/updated: fetch just the one character the API reported.
      const character = await loreWeaveApiService.getCharacterAsync(change.characterId);
      graph.onCharacterSynced(character.id, character.name);
      return;
    }
    // Fact (handout) changes.
    if (change.action === 'deleted') {
      graph.onFactDeleted(change.factId);
      return;
    }
    // A brand-new fact anchored to a character this window has never seen
    // (the system character created moments ago) — reconcile with a full load.
    if (
      change.action === 'created' &&
      change.characterId &&
      !graph.getCharacterNameById(change.characterId)
    ) {
      await loadGraphData();
      return;
    }
    const fact = await loreWeaveApiService.getFactAsync(change.factId);
    graph.onFactSynced(
      new Fact(fact.id, fact.title, fact.content),
      change.action === 'created' ? change.characterId : undefined,
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'CanceledError') return;
    // The HTTP interceptor already toasted; keep the window alive and let the
    // next full load reconcile.
    console.error('LoreWeave: applying synced change failed', error);
  }
}

// --- Board activation ------------------------------------------------------
// Standalone remembers the last shown board per browser; Foundry needs no
// memory — the world setting is the single source of truth there.
const LAST_BOARD_STORAGE_KEY = `${MODULE_ID}:active-board`;

/** Scope the service to the board, load it, and (re)load its graph. */
async function activateBoard(boardId: string) {
  loreWeaveApiService.setActiveBoard(boardId);
  activeBoard.value = await loreWeaveApiService.getBoardAsync(boardId);
  if (isStandalone) localStorage.setItem(LAST_BOARD_STORAGE_KEY, boardId);
  // Selection and path highlights reference nodes of the previous board.
  selection.clearSelection();
  clearHighlightedPath();
  await loadGraphData();
}

onMounted(async () => {
  unsubscribeGraphRefresh =
    graphRefreshSource?.subscribe((change) => void applyExternalGraphChange(change)) ?? null;

  // Foundry: the host resolves (and, on the GM's client, creates) the board
  // correlated with the world — no picker.
  if (boardResolver) {
    try {
      await activateBoard(await boardResolver());
    } catch (error) {
      if (error instanceof Error && error.name === 'CanceledError') return;
      console.error('LoreWeave: resolving the world board failed', error);
      notificationService.notify(
        error instanceof Error ? error.message : 'LoreWeave: failed to resolve the board.',
      );
    }
    return;
  }

  // Standalone: restore the last shown board when it still exists; otherwise
  // let the user pick (or create) one.
  try {
    const lastBoardId = localStorage.getItem(LAST_BOARD_STORAGE_KEY);
    // Probe without the notification service — a vanished board is a normal
    // negative answer here, not an error to toast.
    const probe = new LoreWeaveApiService(apiBaseUrl);
    if (lastBoardId && (await probe.boardExistsAsync(lastBoardId))) {
      await activateBoard(lastBoardId);
      return;
    }
  } catch (error) {
    console.error('LoreWeave: restoring the last board failed', error);
  }
  selectBoardDialogOpen.value = true;
});

onBeforeUnmount(() => {
  unsubscribeGraphRefresh?.();
  loadController?.abort();
});

// --- Modal open/close state ----------------------------------------------
// Each `open*` guard refuses to open a dialog without the selection it needs.
// Dialogs that mutate data additionally refuse to open for players — the
// GM-only menu items are their entry points, this is the second lock.

// Standalone-only board picker; the initial pick (no active board yet) is
// not dismissable, switching later is.
const selectBoardDialogOpen = ref(false);
function openSelectBoardDialog() {
  selectBoardDialogOpen.value = true;
}
function onBoardSelected(boardId: string) {
  void activateBoard(boardId).catch((error) => {
    // HTTP errors already toast via the interceptor; log for triage.
    console.error('LoreWeave: activating the board failed', error);
  });
}

// GM-only board settings (name, colours, graph options). The legend and the
// graph styling follow the saved configuration immediately.
const boardSettingsDialogOpen = ref(false);
function openBoardSettingsDialog() {
  if (!visibility.isGameMaster) return;
  if (!activeBoard.value) return;
  boardSettingsDialogOpen.value = true;
}
function onBoardUpdated(board: VersionedBoard) {
  activeBoard.value = board;
}

// User manual; open to everyone — its GM-only sections hide themselves.
const helpDialogOpen = ref(false);
function openHelpDialog() {
  helpDialogOpen.value = true;
}

const createDialogOpen = ref(false);
function openCreateDialog() {
  if (!visibility.isGameMaster) return;
  createDialogOpen.value = true;
}

const createKnowEdgeModalOpen = ref(false);
function openCreateKnowEdgeDialog() {
  if (!visibility.isGameMaster) return;
  if (!firstSelectedNodeId.value || !secondSelectedNodeId.value) return;
  createKnowEdgeModalOpen.value = true;
}

const updateNodeCharacterNodeModal = ref(false);
function openUpdateDialog() {
  if (!visibility.isGameMaster) return;
  if (!firstSelectedNodeId.value || selectedCharacterIsProtected.value) return;
  updateNodeCharacterNodeModal.value = true;
}

const updateKnowEdgeModalOpen = ref(false);
function openUpdateKnowEdgeDialog() {
  if (!visibility.isGameMaster) return;
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
  if (!visibility.isGameMaster) return;
  if (!firstSelectedNodeId.value) return;
  createFactDialogOpen.value = true;
}

const updateFactDialogOpen = ref(false);
function openUpdateFactDialog() {
  if (!visibility.isGameMaster) return;
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
  if (!visibility.isGameMaster) return;
  if (!selectedFactNodeId.value) return;
  connectFactDialogOpen.value = true;
}

// Read-only fact window, opened by double-clicking a fact node (the interaction
// handler passes the clicked id; the selection is already set at that point).
const factDetailsDialogOpen = ref(false);
const selectedFact = computed(() =>
  selectedFactNodeId.value ? (graph.getFactById(selectedFactNodeId.value) ?? null) : null,
);
function openFactDetailsDialog(factId: string) {
  if (!graph.getFactById(factId)) return;
  factDetailsDialogOpen.value = true;
}

// Read-only relation window, opened by double-clicking a know edge. Fact edges
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
      v-model:layouts="layouts"
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
      :isGameMaster="visibility.isGameMaster"
      :isCharacterHidden="selectedCharacterIsHidden"
      :isProtectedCharacter="selectedCharacterIsProtected"
      @openUpdateCharacterDialog="openUpdateDialog"
      @openFindPathDialog="openFindPathDialog"
      @openCreateKnowEdgeDialog="openCreateKnowEdgeDialog"
      @openCreateFactDialog="openCreateFactDialog"
      @deletedCharacterFromMenu="onCharacterDeleted"
      @toggleCharacterVisibility="toggleSelectedCharacterVisibility"
    />
    <FactNodeContextMenuComponent
      ref="factMenuRef"
      :loreWeaveApiService="loreWeaveApiService"
      :selectedFactId="selectedFactNodeId"
      :isGameMaster="visibility.isGameMaster"
      :isFactHidden="selectedFactIsHidden"
      @openUpdateFactDialog="openUpdateFactDialog"
      @openConnectFactDialog="openConnectFactDialog"
      @deletedFactFromMenu="onFactDeleted"
      @toggleFactVisibility="toggleSelectedFactVisibility"
    />
    <EdgeContextMenuComponent
      ref="edgeMenuRef"
      :loreWeaveApiService="loreWeaveApiService"
      :selectedEdgeId="selectedEdgeId"
      :edgeIdSeparator="EDGE_ID_SEPARATOR"
      :isFactEdge="selectedEdgeIsFactEdge"
      :isGameMaster="visibility.isGameMaster"
      :isEdgeHidden="selectedEdgeIsHidden"
      :isEdgeHiddenViaNode="selectedEdgeIsHiddenViaNode"
      @openUpdateKnowEdgeDialog="openUpdateKnowEdgeDialog"
      @deleteKnowEdgeFromMenu="onEdgeKnowDeleted"
      @deleteFactEdgeFromMenu="onFactEdgeDeleted"
      @toggleEdgeVisibility="toggleSelectedEdgeVisibility"
    />
    <ViewContextMenuComponent
      ref="viewMenuRef"
      :isGameMaster="visibility.isGameMaster"
      @openCreateCharacterDialog="openCreateDialog"
    />

    <CreateCharacterComponent
      v-model:open="createDialogOpen"
      :loreWeaveApiService="loreWeaveApiService"
      @characterCreated="onCharacterCreated"
    />

    <UpdateCharacterComponent
      v-model:open="updateNodeCharacterNodeModal"
      :loreWeaveApiService="loreWeaveApiService"
      :characterId="firstSelectedNodeId"
      @updatedCharacter="onCharacterUpdatedInDialog"
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
      @updatedFact="onFactUpdatedInDialog"
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

    <BoardSettingsComponent
      v-model:open="boardSettingsDialogOpen"
      :loreWeaveApiService="loreWeaveApiService"
      :boardId="activeBoard?.id ?? null"
      @boardUpdated="onBoardUpdated"
    />

    <SelectBoardComponent
      v-if="isStandalone"
      v-model:open="selectBoardDialogOpen"
      :loreWeaveApiService="loreWeaveApiService"
      :dismissable="activeBoard !== null"
      :activeBoardId="activeBoard?.id ?? null"
      @boardSelected="onBoardSelected"
    />

    <div class="board-toolbar">
      <span v-if="activeBoard" id="active-board-name" class="tag is-medium">
        {{ activeBoard.name }}
      </span>
      <button
        v-if="activeBoard && visibility.isGameMaster"
        id="open-board-settings-button"
        class="button is-small"
        type="button"
        @click="openBoardSettingsDialog"
      >
        Board settings
      </button>
      <button
        v-if="isStandalone"
        id="open-select-board-button"
        class="button is-small"
        type="button"
        @click="openSelectBoardDialog"
      >
        Boards
      </button>
      <button
        id="open-help-button"
        class="button is-small"
        type="button"
        title="How to use LoreWeave"
        @click="openHelpDialog"
      >
        Help
      </button>
    </div>

    <HelpManualComponent v-model:open="helpDialogOpen" :isGameMaster="visibility.isGameMaster" />

    <NotificationListComponent :notificationService="notificationService" />

    <GraphLegendComponent :isGameMaster="visibility.isGameMaster" :palette="palette" />

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

/* Board name + board actions, anchored to the top-right corner. */
.board-toolbar {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.board-toolbar .button {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
