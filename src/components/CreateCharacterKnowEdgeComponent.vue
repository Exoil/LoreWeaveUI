<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import type { RpgAssistantService } from '@/services/RpgAssistantService';
import { KnowEdge } from '@/models/KnowEdge';

const props = defineProps<{
  rpgAssistantService: RpgAssistantService;
  fromNodeId: string | null;
  targetNodeId: string | null;
}>();
let controller: AbortController | null = null;
const emit = defineEmits<{
  createKnowEdge: [edge: KnowEdge];
}>();

const description = ref('');
// Strong by default → solid edge line; unchecking makes it a weak (dashed) one.
const isStrongRelation = ref(true);

async function onClickCreateKnowEdge() {
  controller?.abort();
  if (!props.fromNodeId || !props.targetNodeId) return;

  controller = new AbortController();
  const signal = controller.signal;
  await props.rpgAssistantService.createKnowRelationBetweenCharacters(
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
}

onBeforeUnmount(() => {
  controller?.abort();
});
</script>

<template>
  <div class="create-know-edge-form">
    <input
      id="create-know-edge-description-input"
      v-model="description"
      class="input is-small"
      type="text"
      placeholder="Relation description"
    />
    <label id="create-know-edge-strong-label" class="checkbox is-small">
      <input id="create-know-edge-strong-checkbox" v-model="isStrongRelation" type="checkbox" />
      Strong relation
    </label>
    <button
      id="create-know-edge-button"
      @click="onClickCreateKnowEdge"
      :disabled="!fromNodeId || !targetNodeId"
    >
      Create know edge
    </button>
  </div>
</template>

<style scoped>
.create-know-edge-form {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.375rem 1rem;
}

#create-know-edge-strong-label {
  color: #111827;
  font-size: 0.85rem;
}

#create-know-edge-button:disabled {
  background: #9ca3af;
  color: #111827;
  border-color: #6b7280;
  cursor: not-allowed;
  opacity: 1;
}
</style>
