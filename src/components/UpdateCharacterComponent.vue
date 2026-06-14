<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import type { RpgAssistantService } from '@/services/RpgAssistantService';
import { UpdateCharacter } from '@/services/Models/UpdateCharacter';
import { VersionedCharacter } from '@/services/Models/VersionedCharacter';

const props = defineProps<{
  rpgAssistantService: RpgAssistantService;
  characterId: string | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  updatedCharacter: [characterData: VersionedCharacter];
}>();

const characterData = ref(new VersionedCharacter('', '', ''));
let controller: AbortController | null = null;

async function onClickUpdateCharacter() {
  controller?.abort();
  controller = new AbortController();

  const signal = controller.signal;
  await props.rpgAssistantService.updateCharacterAsync(
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

async function loadCharacterById(id: string) {
  controller?.abort();
  controller = new AbortController();

  const dto = await props.rpgAssistantService.getCharacterAsync(id, controller.signal);
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
          id="update-character-node-name-input"
          type="text"
          placeholder="Enter new name"
          v-model="characterData.name"
        />
      </section>
      <footer class="modal-card-foot">
        <div class="buttons">
          <button
            class="button is-light"
            id="update-character-node-submit-button"
            @click="onClickUpdateCharacter"
          >
            Update
          </button>
          <button class="button is-ghost" @click="onClickCancel">Cancel</button>
        </div>
      </footer>
    </div>
  </div>
</template>
