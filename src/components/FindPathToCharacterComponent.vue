<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { usePaginatedCharacterSearch } from '@/composables/usePaginatedCharacterSearch';

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
  fromCharacterId: string | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  pathFound: [characterIds: string[]];
}>();

const SCROLL_THRESHOLD_PX = 24;

const { query, items, loading, hasMore, loadMore, reset, cancel } = usePaginatedCharacterSearch(
  props.loreWeaveApiService,
  { pageSize: 10, debounceMs: 250, excludeId: () => props.fromCharacterId },
);

const noPathFound = ref(false);
const findingPath = ref(false);
let findPathController: AbortController | null = null;

function onListScroll(event: Event) {
  const el = event.currentTarget as HTMLElement;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD_PX) {
    void loadMore();
  }
}

async function onSelectCharacter(toId: string) {
  if (!props.fromCharacterId) return;
  findPathController?.abort();
  findPathController = new AbortController();
  findingPath.value = true;
  noPathFound.value = false;
  try {
    const path = await props.loreWeaveApiService.findRelationBetweenCharactersAsync(
      props.fromCharacterId,
      toId,
      findPathController.signal,
    );
    if (path.isEmpty) {
      noPathFound.value = true;
      return;
    }
    emit('pathFound', path.characterIds);
    closeAndReset();
  } finally {
    findingPath.value = false;
  }
}

function onClickCancel() {
  closeAndReset();
}

function closeAndReset() {
  open.value = false;
  query.value = '';
  noPathFound.value = false;
  reset();
}

watch(open, (isOpen) => {
  if (!isOpen) {
    query.value = '';
    noPathFound.value = false;
    reset();
  }
});

onBeforeUnmount(() => {
  cancel();
  findPathController?.abort();
});
</script>

<template>
  <div class="modal" :class="{ 'is-active': open }">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Search path to character</p>
      </header>
      <section class="modal-card-body">
        <input
          id="find-path-name-input"
          class="input"
          type="text"
          placeholder="Type character name"
          v-model="query"
        />

        <p v-if="noPathFound" id="find-path-no-path-message" class="help is-danger mt-2">
          No path exists between selected characters.
        </p>

        <ul id="find-path-results-list" class="results-list mt-3" @scroll="onListScroll">
          <li v-if="loading && items.length === 0" class="results-empty">Loading…</li>
          <li
            v-for="character in items"
            :key="character.id"
            class="result-item"
            :class="{ 'is-disabled': findingPath }"
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
          <button id="find-path-cancel-button" class="button is-ghost" @click="onClickCancel">
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
