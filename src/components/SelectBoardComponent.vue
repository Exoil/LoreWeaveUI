<script setup lang="ts">
/**
 * Modal for the standalone SPA to pick which board (game graph) to show, or
 * to create a new one. The Foundry module never renders this — there the
 * board is resolved from the world.
 * - Loads the board list each time it opens.
 * - `dismissable` controls the Cancel button: the initial pick (no active
 *   board yet) cannot be dismissed, switching later can.
 * - Emits `boardSelected` with the chosen (or freshly created) board id.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import type { Board } from '@/services/Models/Board';
import { BOARD_NAME_MAX_LENGTH } from '@/services/Models/ValidationRules';

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
  /** Whether the modal may be closed without picking a board. */
  dismissable: boolean;
  /** Id of the currently active board (highlighted in the list), if any. */
  activeBoardId: string | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  boardSelected: [boardId: string];
}>();

const boards = ref<Board[]>([]);
const loading = ref(false);
const newBoardName = ref('');

// Contract: name 1..50 — block submits that would 400.
const nameTooLong = computed(() => newBoardName.value.length > BOARD_NAME_MAX_LENGTH);
const createInvalid = computed(() => nameTooLong.value || newBoardName.value.trim().length === 0);

let controller: AbortController | null = null;

/** Fetch the board list (aborting any prior load). */
async function loadBoards() {
  controller?.abort();
  controller = new AbortController();
  loading.value = true;
  try {
    boards.value = await props.loreWeaveApiService.getBoardsAsync(controller.signal);
  } finally {
    loading.value = false;
  }
}

function onClickBoard(boardId: string) {
  emit('boardSelected', boardId);
  open.value = false;
}

async function onClickCreateBoard() {
  if (createInvalid.value) return;
  controller?.abort();
  controller = new AbortController();

  const boardId = await props.loreWeaveApiService.createBoardAsync(
    newBoardName.value.trim(),
    controller.signal,
  );
  newBoardName.value = '';
  emit('boardSelected', boardId);
  open.value = false;
}

function onClickCancel() {
  if (!props.dismissable) return;
  open.value = false;
}

// Reload the list each time the modal opens — another client may have added
// or removed boards since the last open.
watch(
  () => open.value,
  async (isOpen) => {
    if (!isOpen) return;
    await loadBoards();
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
        <p class="modal-card-title">Select a board</p>
      </header>
      <section class="modal-card-body">
        <p v-if="loading" id="select-board-loading" class="has-text-grey">Loading boards…</p>
        <p v-else-if="boards.length === 0" id="select-board-empty" class="has-text-grey">
          No boards yet — create the first one below.
        </p>
        <ul v-else id="select-board-list">
          <li v-for="board in boards" :key="board.id" class="mb-1">
            <button
              class="button is-fullwidth is-justify-content-flex-start"
              :class="board.id === activeBoardId ? 'is-link is-light' : 'is-white'"
              :id="`select-board-${board.id}`"
              type="button"
              @click="onClickBoard(board.id)"
            >
              {{ board.name }}
            </button>
          </li>
        </ul>

        <hr />

        <div class="field">
          <label class="label" for="select-board-new-name-input">Create a new board</label>
          <div class="is-flex">
            <input
              class="input"
              :class="{ 'is-danger': nameTooLong }"
              id="select-board-new-name-input"
              type="text"
              placeholder="Enter board name"
              v-model="newBoardName"
              @keyup.enter="onClickCreateBoard"
            />
            <button
              class="button is-light ml-2"
              id="select-board-create-button"
              :disabled="createInvalid"
              @click="onClickCreateBoard"
            >
              Create
            </button>
          </div>
          <p
            id="select-board-new-name-help"
            class="help"
            :class="nameTooLong ? 'is-danger' : 'has-text-grey'"
          >
            {{ newBoardName.length }} / {{ BOARD_NAME_MAX_LENGTH }} characters
          </p>
        </div>
      </section>
      <footer class="modal-card-foot">
        <div class="buttons">
          <button
            v-if="dismissable"
            class="button is-ghost"
            id="select-board-cancel-button"
            @click="onClickCancel"
          >
            Cancel
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>
