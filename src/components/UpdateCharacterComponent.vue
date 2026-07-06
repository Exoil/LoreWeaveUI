<script setup lang="ts">
/**
 * Modal to rename a character.
 * - Loads the current character (and its ETag `version`) whenever `characterId`
 *   changes, so the update carries the right version for concurrency.
 * - Emits `updatedCharacter` with the {@link VersionedCharacter} on success.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { UpdateCharacter } from '@/services/Models/UpdateCharacter';
import { VersionedCharacter } from '@/services/Models/VersionedCharacter';
import { CHARACTER_NAME_MAX_LENGTH } from '@/services/Models/ValidationRules';

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
  characterId: string | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  updatedCharacter: [characterData: VersionedCharacter];
}>();

const characterData = ref(new VersionedCharacter('', '', ''));
// Contract: name 1..50 — block submits that would 400.
const nameTooLong = computed(() => characterData.value.name.length > CHARACTER_NAME_MAX_LENGTH);
const formInvalid = computed(
  () => nameTooLong.value || characterData.value.name.trim().length === 0,
);
let controller: AbortController | null = null;

async function onClickUpdateCharacter() {
  if (formInvalid.value) return;
  controller?.abort();
  controller = new AbortController();

  const signal = controller.signal;
  await props.loreWeaveApiService.updateCharacterAsync(
    new UpdateCharacter(
      characterData.value.id,
      characterData.value.name,
      characterData.value.version,
    ),
    signal,
  );

  emit('updatedCharacter', characterData.value);
  open.value = false;
}

function onClickCancel() {
  open.value = false;
}

/** Fetch the character + its version into the form (aborting any prior load). */
async function loadCharacterById(id: string) {
  controller?.abort();
  controller = new AbortController();

  const dto = await props.loreWeaveApiService.getCharacterAsync(id, controller.signal);
  characterData.value.id = dto.id;
  characterData.value.name = dto.name;
  characterData.value.version = dto.version;
}

watch(
  () => props.characterId,
  async (id) => {
    if (!id) return;
    await loadCharacterById(id);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  controller?.abort();
});
</script>

<template>
  <div class="modal" :class="{ 'is-active': open }">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Update character node</p>
      </header>
      <section class="modal-card-body">
        <input
          class="input"
          :class="{ 'is-danger': nameTooLong }"
          id="update-character-node-name-input"
          type="text"
          placeholder="Enter new name"
          v-model="characterData.name"
        />
        <p
          id="update-character-node-name-help"
          class="help"
          :class="nameTooLong ? 'is-danger' : 'has-text-grey'"
        >
          {{ characterData.name.length }} / {{ CHARACTER_NAME_MAX_LENGTH }} characters
        </p>
      </section>
      <footer class="modal-card-foot">
        <div class="buttons">
          <button
            class="button is-light"
            id="update-character-node-submit-button"
            @click="onClickUpdateCharacter"
            :disabled="formInvalid"
          >
            Update
          </button>
          <button class="button is-ghost" @click="onClickCancel">Cancel</button>
        </div>
      </footer>
    </div>
  </div>
</template>
