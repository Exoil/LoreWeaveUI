<script setup lang="ts">
/**
 * Disconnect-fact action button (embedded in the edge context menu for fact
 * edges). The `edgeId` encodes both endpoints (`<characterId><sep><factId>`);
 * it is split on `edgeIdSeparator` to address the connection. The fact itself
 * is not deleted. Emits `deletedFactEdge` with the edge id on success.
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
  deletedFactEdge: [deletedEdgeId: string];
}>();

async function onClickDeleteFactEdge() {
  controller?.abort();
  if (!props.edgeId) return;

  controller = new AbortController();
  const signal = controller.signal;
  const [characterId, factId] = props.edgeId.split(props.edgeIdSeparator);
  await props.loreWeaveApiService.disconnectFactFromCharacterAsync(characterId!, factId!, signal);

  emit('deletedFactEdge', props.edgeId);
}

onBeforeUnmount(() => {
  controller?.abort();
});
</script>

<template>
  <div class="delete-fact-edge-form">
    <button id="delete-fact-edge-button" @click="onClickDeleteFactEdge">Delete fact edge</button>
  </div>
</template>
