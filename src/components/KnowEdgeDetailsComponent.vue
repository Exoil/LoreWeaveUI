<script setup lang="ts">
/**
 * Read-only window showing a know-relation's full description (edge labels in
 * the graph are truncated). Opened by double-clicking a relation edge;
 * `v-model:open` controls visibility.
 */
import { computed } from 'vue';
import type { KnowEdge } from '@/models/KnowEdge';

const props = defineProps<{
  /** The relation to display; the dialog renders nothing meaningful when null. */
  edge: KnowEdge | null;
  /** Display name of the source character (falls back to its id). */
  fromCharacterName: string | null;
  /** Display name of the target character (falls back to its id). */
  toCharacterName: string | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const title = computed(() => {
  if (!props.edge) return '';
  const from = props.fromCharacterName ?? props.edge.source;
  const to = props.toCharacterName ?? props.edge.target;
  return `${from} → ${to}`;
});

function onClickClose() {
  open.value = false;
}
</script>

<template>
  <div class="modal" :class="{ 'is-active': open }">
    <div class="modal-background" @click="onClickClose"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p id="know-edge-details-title" class="modal-card-title">{{ title }}</p>
        <button
          id="know-edge-details-close-button"
          class="delete"
          type="button"
          aria-label="close"
          @click="onClickClose"
        ></button>
      </header>
      <section class="modal-card-body">
        <span
          id="know-edge-details-strength"
          class="tag mb-3"
          :class="edge?.isStrongRelation ? 'is-success' : 'is-warning'"
        >
          {{ edge?.isStrongRelation ? 'Strong relation' : 'Weak relation' }}
        </span>
        <p id="know-edge-details-description" class="know-edge-details-description">
          {{ edge?.description }}
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.know-edge-details-description {
  /* Descriptions are free text; keep the author's line breaks. */
  white-space: pre-wrap;
}
</style>
