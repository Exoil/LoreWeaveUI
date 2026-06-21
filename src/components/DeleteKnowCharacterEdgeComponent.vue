<script setup lang="ts">
/**
 * Delete-relation action button (embedded in the edge context menu). The `edgeId`
 * encodes both endpoints (`<fromId><sep><toId>`); it is split on `edgeIdSeparator`
 * to address the relation. Emits `deletedKnowEdge` with the edge id on success.
 */
import { onBeforeUnmount } from 'vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
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
  await props.loreWeaveApiService.deleteKnowRelationBetweenCharacters(fromId!, toId!, signal);

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
