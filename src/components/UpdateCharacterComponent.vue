<script setup lang="ts">
/**
 * Modal to rename a character.
 * - Loads the current character (and its ETag `version`) each time it opens,
 *   so the update carries the right version even after an external change
 *   (e.g. the Foundry document sync renamed the character in the meantime).
 * - A 412 on save reloads the fresh name + version into the form and keeps
 *   the modal open so the user can retry.
 * - Emits `updatedCharacter` with the {@link VersionedCharacter} on success.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
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
  try {
    await props.loreWeaveApiService.updateCharacterAsync(
      new UpdateCharacter(
        characterData.value.id,
        characterData.value.name,
        characterData.value.version,
      ),
      signal,
    );
  } catch (error) {
    // Someone else changed the character since it was loaded (e.g. the
    // Foundry sync) — pull the fresh name + version and let the user retry.
    if (LoreWeaveApiService.isPreconditionFailedError(error) && props.characterId) {
      await loadCharacterById(props.characterId);
      return;
    }
    throw error;
  }

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

// Load the current character each time the modal is opened — not just when
// the id changes. The same character may have been renamed by the Foundry
// sync since the last open; a stale form means a stale ETag and a 412.
// Watching the id too covers the selection changing while the modal is open.
watch(
  [() => open.value, () => props.characterId],
  async ([isOpen, id]) => {
    if (!isOpen) return;
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
          <button id="update-character-node-cancel-button" class="button is-ghost" @click="onClickCancel">
            Cancel
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>
