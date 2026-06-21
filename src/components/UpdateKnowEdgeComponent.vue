<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import type { RpgAssistantService } from '@/services/RpgAssistantService';
import { UpdateKnowRelation } from '@/services/Models/UpdateKnowRelation';
import { VersionedKnowRelation } from '@/services/Models/VersionedKnowRelation';

const props = defineProps<{
  rpgAssistantService: RpgAssistantService;
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
let controller: AbortController | null = null;

function applyRelation(relation: VersionedKnowRelation) {
  description.value = relation.description;
  isStrongRelation.value = relation.isStrongRelation;
  version.value = relation.version;
}

async function loadRelation(fromId: string, toId: string) {
  controller?.abort();
  controller = new AbortController();

  const relation = await props.rpgAssistantService.getKnowRelationAsync(
    fromId,
    toId,
    controller.signal,
  );
  applyRelation(relation);
}

async function onClickUpdateKnowEdge() {
  if (!props.fromCharacterId || !props.toCharacterId) return;

  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;

  await props.rpgAssistantService.updateKnowRelationAsync(
    new UpdateKnowRelation(
      props.fromCharacterId,
      props.toCharacterId,
      description.value,
      isStrongRelation.value,
      version.value,
    ),
    signal,
  );

  // Re-read the relation so the UI reflects what was persisted, including the
  // new version, rather than trusting the local form state.
  const refreshed = await props.rpgAssistantService.getKnowRelationAsync(
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
          type="text"
          placeholder="Relation description"
          v-model="description"
        />
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
          >
            Update
          </button>
          <button class="button is-ghost" @click="onClickCancel">Cancel</button>
        </div>
      </footer>
    </div>
  </div>
</template>
