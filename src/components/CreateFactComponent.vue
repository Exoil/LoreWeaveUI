<script setup lang="ts">
/**
 * Modal to create a fact for the character `characterId`.
 * - `v-model:open` controls visibility; the form resets each time it opens.
 * - Emits `factCreated` with the character id and the new {@link FactNode}
 *   after the backend call, so the graph can add the node and its edge.
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { FactNode } from '@/models/FactNode';
import { Fact } from '@/services/Models/Fact';
import { FACT_TITLE_MAX_LENGTH, FACT_CONTENT_MAX_LENGTH } from '@/services/Models/ValidationRules';

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
// Contract: title 1..100, content 1..3000 — block submits that would 400.
const titleTooLong = computed(() => title.value.length > FACT_TITLE_MAX_LENGTH);
const contentTooLong = computed(() => content.value.length > FACT_CONTENT_MAX_LENGTH);
const formInvalid = computed(
  () =>
    titleTooLong.value ||
    contentTooLong.value ||
    title.value.trim().length === 0 ||
    content.value.trim().length === 0,
);
let controller: AbortController | null = null;

/** Create the fact on the backend, emit the new node, then close. */
async function onClickCreateFact() {
  if (!props.characterId || formInvalid.value) return;

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
          :class="{ 'is-danger': titleTooLong }"
          type="text"
          placeholder="Fact title"
          v-model="title"
        />
        <p
          id="create-fact-title-help"
          class="help"
          :class="titleTooLong ? 'is-danger' : 'has-text-grey'"
        >
          {{ title.length }} / {{ FACT_TITLE_MAX_LENGTH }} characters
        </p>
        <textarea
          id="create-fact-content-input"
          class="textarea mt-3"
          :class="{ 'is-danger': contentTooLong }"
          placeholder="Fact content"
          v-model="content"
        ></textarea>
        <p
          id="create-fact-content-help"
          class="help"
          :class="contentTooLong ? 'is-danger' : 'has-text-grey'"
        >
          {{ content.length }} / {{ FACT_CONTENT_MAX_LENGTH }} characters
        </p>
      </section>
      <footer class="modal-card-foot">
        <div class="buttons">
          <button
            id="create-fact-submit-button"
            class="button is-light"
            @click="onClickCreateFact"
            :disabled="!characterId || formInvalid"
          >
            Create
          </button>
          <button class="button is-ghost" @click="onClickCancel">Cancel</button>
        </div>
      </footer>
    </div>
  </div>
</template>
