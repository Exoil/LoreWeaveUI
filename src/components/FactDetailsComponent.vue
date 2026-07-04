<script setup lang="ts">
/**
 * Read-only window showing a fact's title and full content. Opened by
 * double-clicking a fact node in the graph; `v-model:open` controls visibility.
 */
import type { Fact } from '@/services/Models/Fact';

defineProps<{
  /** The fact to display; the dialog renders nothing meaningful when null. */
  fact: Fact | null;
}>();

const open = defineModel<boolean>('open', { required: true });

function onClickClose() {
  open.value = false;
}
</script>

<template>
  <div class="modal" :class="{ 'is-active': open }">
    <div class="modal-background" @click="onClickClose"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p id="fact-details-title" class="modal-card-title">{{ fact?.title }}</p>
        <button
          id="fact-details-close-button"
          class="delete"
          type="button"
          aria-label="close"
          @click="onClickClose"
        ></button>
      </header>
      <section class="modal-card-body">
        <p id="fact-details-content" class="fact-details-content">{{ fact?.content }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.fact-details-content {
  /* Facts are free text; keep the author's line breaks. */
  white-space: pre-wrap;
}
</style>
