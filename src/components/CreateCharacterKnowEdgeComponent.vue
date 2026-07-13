<script setup lang="ts">
/**
 * Modal to create a "knows" relation from `fromNodeId` to `targetNodeId`.
 * - `v-model:open` controls visibility; the form resets each time it opens.
 * - Emits `createKnowEdge` with the new {@link KnowEdge} after the backend call.
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { KnowEdge } from '@/models/KnowEdge';
import { KNOW_DESCRIPTION_MAX_LENGTH } from '@/services/Models/ValidationRules';

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
  fromNodeId: string | null;
  targetNodeId: string | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  createKnowEdge: [edge: KnowEdge];
}>();

const description = ref('');
// Strong by default → solid edge line; unchecking makes it a weak (dashed) one.
const isStrongRelation = ref(true);
// Contract: description 0..256 (may be empty) — block submits that would 400.
const descriptionTooLong = computed(() => description.value.length > KNOW_DESCRIPTION_MAX_LENGTH);
let controller: AbortController | null = null;

/** Create the relation on the backend, emit the new edge, then close. */
async function onClickCreateKnowEdge() {
  if (!props.fromNodeId || !props.targetNodeId || descriptionTooLong.value) return;

  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;

  await props.loreWeaveApiService.createKnowRelationBetweenCharacters(
    props.fromNodeId,
    props.targetNodeId,
    description.value,
    isStrongRelation.value,
    signal,
  );

  emit(
    'createKnowEdge',
    new KnowEdge(props.fromNodeId, props.targetNodeId, description.value, isStrongRelation.value),
  );
  open.value = false;
}

function onClickCancel() {
  open.value = false;
}

// Start each create from a clean form whenever the modal is opened.
watch(
  () => open.value,
  (isOpen) => {
    if (!isOpen) return;
    description.value = '';
    isStrongRelation.value = true;
  },
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
        <p class="modal-card-title">Create relation</p>
      </header>
      <section class="modal-card-body">
        <input
          id="create-know-edge-description-input"
          class="input"
          :class="{ 'is-danger': descriptionTooLong }"
          type="text"
          placeholder="Relation description"
          v-model="description"
        />
        <p
          id="create-know-edge-description-help"
          class="help"
          :class="descriptionTooLong ? 'is-danger' : 'has-text-grey'"
        >
          {{ description.length }} / {{ KNOW_DESCRIPTION_MAX_LENGTH }} characters
        </p>
        <label id="create-know-edge-strong-label" class="checkbox mt-3">
          <input id="create-know-edge-strong-checkbox" type="checkbox" v-model="isStrongRelation" />
          Strong relation
        </label>
      </section>
      <footer class="modal-card-foot">
        <div class="buttons">
          <button
            id="create-know-edge-button"
            class="button is-light"
            @click="onClickCreateKnowEdge"
            :disabled="!fromNodeId || !targetNodeId || descriptionTooLong"
          >
            Create
          </button>
          <button id="create-know-edge-cancel-button" class="button is-ghost" @click="onClickCancel">
            Cancel
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>
