<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import type { RpgAssistantService } from '@/services/RpgAssistantService';

const props = defineProps<{
  rpgAssistantService: RpgAssistantService;
  fromNodeId: string | null;
  targetNodeId: string | null;
  edgeIdSeparator: string;
}>();
let controller: AbortController | null = null;
const emit = defineEmits<{
  createKnowEdge: [createdEdgeId: string];
}>();

async function onClickCreateKnowEdge() {
  controller?.abort();
  if (!props.fromNodeId || !props.targetNodeId) return;

  controller = new AbortController();
  const signal = controller.signal;
  await props.rpgAssistantService.createKnowRelationBetweenCharacters(
    props.fromNodeId,
    props.targetNodeId,
    '',
    signal,
  );

  const edgeId = props.fromNodeId + props.edgeIdSeparator + props.targetNodeId;
  emit('createKnowEdge', edgeId);
}

onBeforeUnmount(() => {
  controller?.abort();
});
</script>

<template>
  <div class="create-know-edge-form">
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
#create-know-edge-button:disabled {
  background: #9ca3af;
  color: #111827;
  border-color: #6b7280;
  cursor: not-allowed;
  opacity: 1;
}
</style>
