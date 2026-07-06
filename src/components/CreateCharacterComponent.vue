<script setup lang="ts">
/**
 * Modal to create a character node.
 * - `v-model:open` controls visibility.
 * - Emits `characterCreated` with the new {@link CharacterNode} after the backend
 *   call succeeds, then clears the form and closes.
 */
import { computed, onBeforeUnmount, ref } from 'vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { CharacterNode } from '@/models/CharacterNode';
import { Character } from '@/services/Models/Character';
import { CHARACTER_NAME_MAX_LENGTH } from '@/services/Models/ValidationRules';

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  characterCreated: [node: CharacterNode];
}>();

let controller: AbortController | null = null;
const characterCreateName = ref('');
// Contract: name 1..50 — block submits that would 400.
const nameTooLong = computed(() => characterCreateName.value.length > CHARACTER_NAME_MAX_LENGTH);
const formInvalid = computed(
  () => nameTooLong.value || characterCreateName.value.trim().length === 0,
);

/** Create the character on the backend, emit the new node, then reset + close. */
async function onClickCreateCharacter() {
  if (formInvalid.value) return;
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
          :class="{ 'is-danger': nameTooLong }"
          id="create-character-node-name-input"
          type="text"
          placeholder="Enter new name"
          v-model="characterCreateName"
        />
        <p
          id="create-character-node-name-help"
          class="help"
          :class="nameTooLong ? 'is-danger' : 'has-text-grey'"
        >
          {{ characterCreateName.length }} / {{ CHARACTER_NAME_MAX_LENGTH }} characters
        </p>
      </section>
      <footer class="modal-card-foot">
        <div class="buttons">
          <button
            id="create-character-node-submit-button"
            class="button is-light"
            @click="onClickCreateCharacter"
            :disabled="formInvalid"
          >
            Create
          </button>
          <button class="button is-ghost" @click="onClickCancel">Cancel</button>
        </div>
      </footer>
    </div>
  </div>
</template>
