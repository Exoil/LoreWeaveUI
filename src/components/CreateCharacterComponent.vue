<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { CharacterNode } from '@/models/CharacterNode';
import { Character } from '@/services/Models/Character';

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  characterCreated: [node: CharacterNode];
}>();

let controller: AbortController | null = null;
const characterCreateName = ref('');

async function onClickCreateCharacter() {
  controller?.abort();
  controller = new AbortController();

  const signal = controller.signal;
  const createResult = await props.loreWeaveApiService.createCharacterAsync(
    characterCreateName.value,
    signal,
  );
  const node = new CharacterNode(new Character(createResult, characterCreateName.value));

  emit('characterCreated', node);
  open.value = false;
  characterCreateName.value = '';
}

function onClickCancel() {
  characterCreateName.value = '';
  open.value = false;
}

onBeforeUnmount(() => {
  controller?.abort();
});
</script>

<template>
  <div class="modal" :class="{ 'is-active': open }">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Create character node</p>
      </header>
      <section class="modal-card-body">
        <input
          class="input"
          id="create-character-node-name-input"
          type="text"
          placeholder="Enter new name"
          v-model="characterCreateName"
        />
      </section>
      <footer class="modal-card-foot">
        <div class="buttons">
          <button
            id="create-character-node-submit-button"
            class="button is-light"
            @click="onClickCreateCharacter"
          >
            Create
          </button>
          <button class="button is-ghost" @click="onClickCancel">Cancel</button>
        </div>
      </footer>
    </div>
  </div>
</template>
