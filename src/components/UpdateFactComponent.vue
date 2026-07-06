<script setup lang="ts">
/**
 * Modal to edit a fact's title/content.
 * - Loads the current fact (and its ETag `version`) each time it opens.
 * - After saving it re-reads the fact so the UI reflects what was persisted
 *   (including the new version) rather than the local form state.
 * - Emits `updatedFact` with the refreshed {@link VersionedFact}.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { UpdateFact } from '@/services/Models/UpdateFact';
import { VersionedFact } from '@/services/Models/VersionedFact';
import { FACT_TITLE_MAX_LENGTH, FACT_CONTENT_MAX_LENGTH } from '@/services/Models/ValidationRules';

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
  factId: string | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  updatedFact: [fact: VersionedFact];
}>();

const title = ref('');
const content = ref('');
const version = ref('');
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

/** Copy a fetched fact into the local form refs. */
function applyFact(fact: VersionedFact) {
  title.value = fact.title;
  content.value = fact.content;
  version.value = fact.version;
}

/** Fetch the current fact (+ version) into the form, aborting any prior load. */
async function loadFact(id: string) {
  controller?.abort();
  controller = new AbortController();

  const fact = await props.loreWeaveApiService.getFactAsync(id, controller.signal);
  applyFact(fact);
}

async function onClickUpdateFact() {
  if (!props.factId || formInvalid.value) return;

  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;

  await props.loreWeaveApiService.updateFactAsync(
    new UpdateFact(props.factId, title.value, content.value, version.value),
    signal,
  );

  // Re-read the fact so the UI reflects what was persisted, including the new
  // version, rather than trusting the local form state.
  const refreshed = await props.loreWeaveApiService.getFactAsync(props.factId, signal);
  applyFact(refreshed);

  emit('updatedFact', refreshed);
  open.value = false;
}

function onClickCancel() {
  open.value = false;
}

// Load the current fact each time the modal is opened.
watch(
  () => open.value,
  async (isOpen) => {
    if (!isOpen) return;
    if (!props.factId) return;
    await loadFact(props.factId);
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
        <p class="modal-card-title">Update fact</p>
      </header>
      <section class="modal-card-body">
        <input
          id="update-fact-title-input"
          class="input"
          :class="{ 'is-danger': titleTooLong }"
          type="text"
          placeholder="Fact title"
          v-model="title"
        />
        <p
          id="update-fact-title-help"
          class="help"
          :class="titleTooLong ? 'is-danger' : 'has-text-grey'"
        >
          {{ title.length }} / {{ FACT_TITLE_MAX_LENGTH }} characters
        </p>
        <textarea
          id="update-fact-content-input"
          class="textarea mt-3"
          :class="{ 'is-danger': contentTooLong }"
          placeholder="Fact content"
          v-model="content"
        ></textarea>
        <p
          id="update-fact-content-help"
          class="help"
          :class="contentTooLong ? 'is-danger' : 'has-text-grey'"
        >
          {{ content.length }} / {{ FACT_CONTENT_MAX_LENGTH }} characters
        </p>
      </section>
      <footer class="modal-card-foot">
        <div class="buttons">
          <button
            id="update-fact-submit-button"
            class="button is-light"
            @click="onClickUpdateFact"
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
