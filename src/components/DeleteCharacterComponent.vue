<script setup lang="ts">
/**
 * Delete-character action button (embedded in the node context menu).
 * Emits `deletedCharacter` with the id after the backend delete succeeds.
 * Disabled when there is no `characterId`.
 */
import { onBeforeUnmount } from 'vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
  characterId: string | null;
  /** Extra host-driven lock (e.g. the protected system character). */
  disabled?: boolean;
}>();
let controller: AbortController | null = null;
const emit = defineEmits<{
  deletedCharacter: [deletedCharacterId: string];
}>();

async function onClickDeleteCharacter() {
  controller?.abort();
  if (!props.characterId || props.disabled) return;

  controller = new AbortController();
  const signal = controller.signal;
  await props.loreWeaveApiService.deleteCharacterAsync(props.characterId, signal);

  emit('deletedCharacter', props.characterId);
}

onBeforeUnmount(() => {
  controller?.abort();
});
</script>

<template>
  <div class="delete-character-form">
    <button
      id="delete-character-button"
      @click="onClickDeleteCharacter"
      :disabled="!characterId || disabled"
    >
      Delete character
    </button>
  </div>
</template>
