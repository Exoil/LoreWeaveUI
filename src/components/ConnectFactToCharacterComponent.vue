<script setup lang="ts">
/**
 * Modal to connect the existing fact `factId` to one more character, picked
 * from a debounced, infinite-scroll search list (characters already connected
 * to the fact are excluded). Selecting a character creates the HAS_FACT
 * connection on the backend and emits `factConnected`. Search is powered by
 * {@link usePaginatedCharacterSearch}.
 */
import { onBeforeUnmount, ref, watch } from 'vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { usePaginatedCharacterSearch } from '@/composables/usePaginatedCharacterSearch';

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
  factId: string | null;
  /** Characters already connected to the fact; hidden from the results. */
  connectedCharacterIds: string[];
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  factConnected: [characterId: string, factId: string];
}>();

const SCROLL_THRESHOLD_PX = 24;

const { query, items, loading, hasMore, loadMore, reset, cancel } = usePaginatedCharacterSearch(
  props.loreWeaveApiService,
  { pageSize: 10, debounceMs: 250, excludeIds: () => props.connectedCharacterIds },
);

const connecting = ref(false);
let connectController: AbortController | null = null;

/** Load the next page once the user scrolls near the bottom of the results. */
function onListScroll(event: Event) {
  const el = event.currentTarget as HTMLElement;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD_PX) {
    void loadMore();
  }
}

/** Connect the fact to the chosen character, emit the new connection, then close. */
async function onSelectCharacter(characterId: string) {
  if (!props.factId) return;
  connectController?.abort();
  connectController = new AbortController();
  connecting.value = true;
  try {
    await props.loreWeaveApiService.connectFactToCharacterAsync(
      characterId,
      props.factId,
      connectController.signal,
    );
    emit('factConnected', characterId, props.factId);
    closeAndReset();
  } finally {
    connecting.value = false;
  }
}

function onClickCancel() {
  closeAndReset();
}

function closeAndReset() {
  open.value = false;
  query.value = '';
  reset();
}

watch(open, (isOpen) => {
  if (!isOpen) {
    query.value = '';
    reset();
  }
});

onBeforeUnmount(() => {
  cancel();
  connectController?.abort();
});
</script>

<template>
  <div class="modal" :class="{ 'is-active': open }">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Connect fact to character</p>
      </header>
      <section class="modal-card-body">
        <input
          id="connect-fact-name-input"
          class="input"
          type="text"
          placeholder="Type character name"
          v-model="query"
        />

        <ul id="connect-fact-results-list" class="results-list mt-3" @scroll="onListScroll">
          <li v-if="loading && items.length === 0" class="results-empty">Loading…</li>
          <li
            v-for="character in items"
            :key="character.id"
            class="result-item"
            :class="{ 'is-disabled': connecting }"
            @click="onSelectCharacter(character.id)"
          >
            {{ character.name }}
          </li>
          <li v-if="loading && items.length > 0" class="results-empty">Loading more…</li>
          <li v-if="!loading && items.length === 0 && query.length > 0" class="results-empty">
            No matching characters.
          </li>
          <li v-if="!loading && !hasMore && items.length > 0" class="results-empty results-end">
            End of results.
          </li>
        </ul>
      </section>
      <footer class="modal-card-foot">
        <div class="buttons">
          <button id="connect-fact-cancel-button" class="button is-ghost" @click="onClickCancel">
            Cancel
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.results-list {
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  background: #ffffff;
}

.result-item {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  color: #111827;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover {
  background: #f3f4f6;
  color: #111827;
}

.result-item.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.results-empty {
  padding: 0.5rem 0.75rem;
  color: #4b5563;
  font-style: italic;
}

.results-end {
  text-align: center;
  font-size: 0.85rem;
}
</style>
