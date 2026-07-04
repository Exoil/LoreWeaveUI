<script setup lang="ts">
/**
 * Delete-fact action button (embedded in the fact node context menu).
 * Emits `deletedFact` with the id after the backend delete succeeds.
 * Disabled when there is no `factId`.
 */
import { onBeforeUnmount } from 'vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
  factId: string | null;
}>();
let controller: AbortController | null = null;
const emit = defineEmits<{
  deletedFact: [deletedFactId: string];
}>();

async function onClickDeleteFact() {
  controller?.abort();
  if (!props.factId) return;

  controller = new AbortController();
  const signal = controller.signal;
  await props.loreWeaveApiService.deleteFactAsync(props.factId, signal);

  emit('deletedFact', props.factId);
}

onBeforeUnmount(() => {
  controller?.abort();
});
</script>

<template>
  <div class="delete-fact-form">
    <button id="delete-fact-button" @click="onClickDeleteFact" :disabled="!factId">
      Delete fact
    </button>
  </div>
</template>
