<script setup lang="ts">
/**
 * Modal to edit a relation's description/strength.
 * - Loads the current relation (and its ETag `version`) each time it opens.
 * - After saving it re-reads the relation so the UI reflects what was persisted
 *   (including the new version) rather than the local form state.
 * - Emits `updatedKnowEdge` with the refreshed {@link VersionedKnowRelation}.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import { UpdateKnowRelation } from '@/services/Models/UpdateKnowRelation';
import { VersionedKnowRelation } from '@/services/Models/VersionedKnowRelation';
import { KNOW_DESCRIPTION_MAX_LENGTH } from '@/services/Models/ValidationRules';

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
  fromCharacterId: string | null;
  toCharacterId: string | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  updatedKnowEdge: [relation: VersionedKnowRelation];
}>();

const description = ref('');
const isStrongRelation = ref(true);
const version = ref('');
// Contract: description 0..256 (may be empty) — block submits that would 400.
const descriptionTooLong = computed(() => description.value.length > KNOW_DESCRIPTION_MAX_LENGTH);
let controller: AbortController | null = null;

/** Copy a fetched relation into the local form refs. */
function applyRelation(relation: VersionedKnowRelation) {
  description.value = relation.description;
  isStrongRelation.value = relation.isStrongRelation;
  version.value = relation.version;
}

/** Fetch the current relation (+ version) into the form, aborting any prior load. */
async function loadRelation(fromId: string, toId: string) {
  controller?.abort();
  controller = new AbortController();

  const relation = await props.loreWeaveApiService.getKnowRelationAsync(
    fromId,
    toId,
    controller.signal,
  );
  applyRelation(relation);
}

async function onClickUpdateKnowEdge() {
  if (!props.fromCharacterId || !props.toCharacterId || descriptionTooLong.value) return;

  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;

  try {
    await props.loreWeaveApiService.updateKnowRelationAsync(
      new UpdateKnowRelation(
        props.fromCharacterId,
        props.toCharacterId,
        description.value,
        isStrongRelation.value,
        version.value,
      ),
      signal,
    );
  } catch (error) {
    // The relation changed since it was loaded — pull the fresh state and
    // let the user retry.
    if (LoreWeaveApiService.isPreconditionFailedError(error)) {
      await loadRelation(props.fromCharacterId, props.toCharacterId);
      return;
    }
    throw error;
  }

  // Re-read the relation so the UI reflects what was persisted, including the
  // new version, rather than trusting the local form state.
  const refreshed = await props.loreWeaveApiService.getKnowRelationAsync(
    props.fromCharacterId,
    props.toCharacterId,
    signal,
  );
  applyRelation(refreshed);

  emit('updatedKnowEdge', refreshed);
  open.value = false;
}

function onClickCancel() {
  open.value = false;
}

// Load the current relation each time the modal is opened.
watch(
  () => open.value,
  async (isOpen) => {
    if (!isOpen) return;
    if (!props.fromCharacterId || !props.toCharacterId) return;
    await loadRelation(props.fromCharacterId, props.toCharacterId);
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
        <p class="modal-card-title">Update relation</p>
      </header>
      <section class="modal-card-body">
        <input
          id="update-know-edge-description-input"
          class="input"
          :class="{ 'is-danger': descriptionTooLong }"
          type="text"
          placeholder="Relation description"
          v-model="description"
        />
        <p
          id="update-know-edge-description-help"
          class="help"
          :class="descriptionTooLong ? 'is-danger' : 'has-text-grey'"
        >
          {{ description.length }} / {{ KNOW_DESCRIPTION_MAX_LENGTH }} characters
        </p>
        <label id="update-know-edge-strong-label" class="checkbox mt-3">
          <input id="update-know-edge-strong-checkbox" type="checkbox" v-model="isStrongRelation" />
          Strong relation
        </label>
      </section>
      <footer class="modal-card-foot">
        <div class="buttons">
          <button
            id="update-know-edge-submit-button"
            class="button is-light"
            @click="onClickUpdateKnowEdge"
            :disabled="descriptionTooLong"
          >
            Update
          </button>
          <button id="update-know-edge-cancel-button" class="button is-ghost" @click="onClickCancel">
            Cancel
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>
