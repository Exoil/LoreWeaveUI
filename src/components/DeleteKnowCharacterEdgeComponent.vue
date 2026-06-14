<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import type { RpgAssistantService } from '@/services/RpgAssistantService';

const props = defineProps<{
  rpgAssistantService: RpgAssistantService;
  edgeId: string | undefined;
  edgeIdSeparator: string;
}>();
let controller: AbortController | null = null;
const emit = defineEmits<{
  deletedKnowEdge: [deletedEdgeId: string];
}>();

async function onClickDeleteKnowEdge() {
  controller?.abort();
  if (!props.edgeId) return;

  controller = new AbortController();
  const signal = controller.signal;
  const [fromId, toId] = props.edgeId.split(props.edgeIdSeparator);
  await props.rpgAssistantService.deleteKnowRelationBetweenCharacters(fromId!, toId!, signal);

  emit('deletedKnowEdge', props.edgeId);
}

onBeforeUnmount(() => {
  controller?.abort();
});
</script>

<template>
  <div class="delete-know-edge-form">
    <button id="delete-know-edge-button" @click="onClickDeleteKnowEdge">Delete know edge</button>
  </div>
</template>
