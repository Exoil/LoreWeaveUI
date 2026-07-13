<script setup lang="ts">
/**
 * Modal for the GM to configure the active board: its name, the node/edge
 * colours, and the v-network-graph view options (node size, edge width,
 * curved edges, grid, zoom scaling).
 * - Loads the current board (and its ETag `version`) each time it opens, so
 *   the update carries the right version even after an external change.
 * - A 412 on save reloads the fresh board into the form and keeps the modal
 *   open so the user can retry.
 * - Emits `boardUpdated` with the {@link VersionedBoard} on success; the
 *   graph styling and the legend follow it live.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { BoardConfiguration } from '@/services/Models/BoardConfiguration';
import { UpdateBoard } from '@/services/Models/UpdateBoard';
import { VersionedBoard } from '@/services/Models/VersionedBoard';
import { BOARD_NAME_MAX_LENGTH } from '@/services/Models/ValidationRules';

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
  boardId: string | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  boardUpdated: [board: VersionedBoard];
}>();

// Contract bounds for the numeric options (BoardConfigurationDto).
const NODE_RADIUS_MIN = 8;
const NODE_RADIUS_MAX = 48;
const EDGE_WIDTH_MIN = 1;
const EDGE_WIDTH_MAX = 12;

const boardData = ref(new VersionedBoard('', '', BoardConfiguration.createDefault(), ''));

/** One colour-picker row; keys index into the form's {@link BoardConfiguration}. */
const colorFields: Array<{
  key:
    | 'characterNodeColor'
    | 'factNodeColor'
    | 'relationEdgeColor'
    | 'factEdgeColor'
    | 'pathHighlightColor';
  label: string;
}> = [
  { key: 'characterNodeColor', label: 'Character node' },
  { key: 'factNodeColor', label: 'Fact node' },
  { key: 'relationEdgeColor', label: 'Relation edge' },
  { key: 'factEdgeColor', label: 'Fact connection' },
  { key: 'pathHighlightColor', label: 'Path highlight' },
];

// Contract: name 1..50, options within their bounds — block submits that would 400.
const nameTooLong = computed(() => boardData.value.name.length > BOARD_NAME_MAX_LENGTH);
const nodeRadiusInvalid = computed(() => {
  const radius = boardData.value.configuration.nodeRadius;
  return !Number.isInteger(radius) || radius < NODE_RADIUS_MIN || radius > NODE_RADIUS_MAX;
});
const edgeWidthInvalid = computed(() => {
  const width = boardData.value.configuration.edgeWidth;
  return !Number.isInteger(width) || width < EDGE_WIDTH_MIN || width > EDGE_WIDTH_MAX;
});
const formInvalid = computed(
  () =>
    nameTooLong.value ||
    boardData.value.name.trim().length === 0 ||
    nodeRadiusInvalid.value ||
    edgeWidthInvalid.value,
);

let controller: AbortController | null = null;

async function onClickSave() {
  if (formInvalid.value) return;
  controller?.abort();
  controller = new AbortController();

  const signal = controller.signal;
  try {
    await props.loreWeaveApiService.updateBoardAsync(
      new UpdateBoard(
        boardData.value.id,
        boardData.value.name,
        boardData.value.configuration,
        boardData.value.version,
      ),
      signal,
    );
  } catch (error) {
    // Someone else changed the board since it was loaded — pull the fresh
    // name + configuration + version and let the user retry.
    if (LoreWeaveApiService.isPreconditionFailedError(error) && props.boardId) {
      await loadBoardById(props.boardId);
      return;
    }
    throw error;
  }

  emit('boardUpdated', boardData.value);
  open.value = false;
}

function onClickCancel() {
  open.value = false;
}

/** Fetch the board + its version into the form (aborting any prior load). */
async function loadBoardById(id: string) {
  controller?.abort();
  controller = new AbortController();

  const board = await props.loreWeaveApiService.getBoardAsync(id, controller.signal);
  // Clone the configuration so cancelling never leaks half-edited colours
  // into the live board object the graph styles itself from.
  boardData.value = new VersionedBoard(
    board.id,
    board.name,
    board.configuration.clone(),
    board.version,
  );
}

// Load the current board each time the modal is opened — not just when the id
// changes. The board may have been edited elsewhere since the last open; a
// stale form means a stale ETag and a 412.
watch(
  [() => open.value, () => props.boardId],
  async ([isOpen, id]) => {
    if (!isOpen) return;
    if (!id) return;
    await loadBoardById(id);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  controller?.abort();
});
</script>

<template>
  <div class="modal" :class="{ 'is-active': open }">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Board settings</p>
      </header>
      <section class="modal-card-body">
        <div class="field">
          <label class="label" for="board-settings-name-input">Board name</label>
          <input
            class="input"
            :class="{ 'is-danger': nameTooLong }"
            id="board-settings-name-input"
            type="text"
            placeholder="Enter board name"
            v-model="boardData.name"
          />
          <p
            id="board-settings-name-help"
            class="help"
            :class="nameTooLong ? 'is-danger' : 'has-text-grey'"
          >
            {{ boardData.name.length }} / {{ BOARD_NAME_MAX_LENGTH }} characters
          </p>
        </div>

        <div class="field">
          <label class="label">Colors</label>
          <div
            v-for="field in colorFields"
            :key="field.key"
            class="is-flex is-align-items-center mb-1"
          >
            <input
              class="board-color-input"
              :id="`board-settings-${field.key}-input`"
              type="color"
              v-model="boardData.configuration[field.key]"
            />
            <span class="ml-2">{{ field.label }}</span>
          </div>
        </div>

        <div class="field">
          <label class="label" for="board-settings-node-radius-input">Node size (px)</label>
          <input
            class="input"
            :class="{ 'is-danger': nodeRadiusInvalid }"
            id="board-settings-node-radius-input"
            type="number"
            :min="NODE_RADIUS_MIN"
            :max="NODE_RADIUS_MAX"
            v-model.number="boardData.configuration.nodeRadius"
          />
          <p class="help" :class="nodeRadiusInvalid ? 'is-danger' : 'has-text-grey'">
            {{ NODE_RADIUS_MIN }}–{{ NODE_RADIUS_MAX }}
          </p>
        </div>

        <div class="field">
          <label class="label" for="board-settings-edge-width-input">Edge width (px)</label>
          <input
            class="input"
            :class="{ 'is-danger': edgeWidthInvalid }"
            id="board-settings-edge-width-input"
            type="number"
            :min="EDGE_WIDTH_MIN"
            :max="EDGE_WIDTH_MAX"
            v-model.number="boardData.configuration.edgeWidth"
          />
          <p class="help" :class="edgeWidthInvalid ? 'is-danger' : 'has-text-grey'">
            {{ EDGE_WIDTH_MIN }}–{{ EDGE_WIDTH_MAX }}
          </p>
        </div>

        <div class="field">
          <label class="checkbox">
            <input
              id="board-settings-curved-edges-input"
              type="checkbox"
              v-model="boardData.configuration.curvedEdges"
            />
            Curved edges
          </label>
        </div>
        <div class="field">
          <label class="checkbox">
            <input
              id="board-settings-show-grid-input"
              type="checkbox"
              v-model="boardData.configuration.showGrid"
            />
            Show background grid
          </label>
        </div>
        <div class="field">
          <label class="checkbox">
            <input
              id="board-settings-scaling-objects-input"
              type="checkbox"
              v-model="boardData.configuration.scalingObjects"
            />
            Zoom scales nodes and edges (map-like)
          </label>
        </div>
      </section>
      <footer class="modal-card-foot">
        <div class="buttons">
          <button
            class="button is-light"
            id="board-settings-submit-button"
            @click="onClickSave"
            :disabled="formInvalid"
          >
            Save
          </button>
          <button id="board-settings-cancel-button" class="button is-ghost" @click="onClickCancel">
            Cancel
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Bulma has no native colour-input styling; keep the swatch compact. */
.board-color-input {
  width: 3rem;
  height: 2rem;
  padding: 0;
  border: 1px solid #dbdbdb;
  border-radius: 4px;
  background: none;
  cursor: pointer;
}
</style>
