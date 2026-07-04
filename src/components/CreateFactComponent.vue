<script setup lang="ts">
/**
 * Modal to create a fact for the character `characterId`.
 * - `v-model:open` controls visibility; the form resets each time it opens.
 * - Emits `factCreated` with the character id and the new {@link FactNode}
 *   after the backend call, so the graph can add the node and its edge.
 */
import { ref, watch, onBeforeUnmount } from 'vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { FactNode } from '@/models/FactNode';
import { Fact } from '@/services/Models/Fact';

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
  characterId: string | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  factCreated: [characterId: string, fact: FactNode];
}>();

const title = ref('');
const content = ref('');
let controller: AbortController | null = null;

/** Create the fact on the backend, emit the new node, then close. */
async function onClickCreateFact() {
  if (!props.characterId) return;

  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;

  const factId = await props.loreWeaveApiService.addFactToCharacterAsync(
    props.characterId,
    title.value,
    content.value,
    signal,
  );

  emit(
    'factCreated',
    props.characterId,
    new FactNode(new Fact(factId, title.value, content.value)),
  );
  open.value = false;
}

function onClickCancel() {
  open.value = false;
}

// Start each create from a clean form whenever the modal is opened.
watch(
  () => open.value,
  (isOpen) => {
    if (!isOpen) return;
    title.value = '';
    content.value = '';
  },
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
        <p class="modal-card-title">Create fact</p>
      </header>
      <section class="modal-card-body">
        <input
          id="create-fact-title-input"
          class="input"
          type="text"
          placeholder="Fact title"
          v-model="title"
        />
        <textarea
          id="create-fact-content-input"
          class="textarea mt-3"
          placeholder="Fact content"
          v-model="content"
        ></textarea>
      </section>
      <footer class="modal-card-foot">
        <div class="buttons">
          <button
            id="create-fact-submit-button"
            class="button is-light"
            @click="onClickCreateFact"
            :disabled="!characterId"
          >
            Create
          </button>
          <button class="button is-ghost" @click="onClickCancel">Cancel</button>
        </div>
      </footer>
    </div>
  </div>
</template>
