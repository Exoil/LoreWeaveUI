<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
  characterId: string | null;
}>();
let controller: AbortController | null = null;
const emit = defineEmits<{
  deletedCharacter: [deletedCharacterId: string];
}>();

async function onClickDeleteCharacter() {
  controller?.abort();
  if (!props.characterId) return;

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
    <button id="delete-character-button" @click="onClickDeleteCharacter" :disabled="!characterId">
      Delete character
    </button>
  </div>
</template>
