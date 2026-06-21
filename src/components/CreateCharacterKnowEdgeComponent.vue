<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { KnowEdge } from '@/models/KnowEdge';

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
let controller: AbortController | null = null;

async function onClickCreateKnowEdge() {
  if (!props.fromNodeId || !props.targetNodeId) return;

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
          type="text"
          placeholder="Relation description"
          v-model="description"
        />
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
            :disabled="!fromNodeId || !targetNodeId"
          >
            Create
          </button>
          <button class="button is-ghost" @click="onClickCancel">Cancel</button>
        </div>
      </footer>
    </div>
  </div>
</template>
