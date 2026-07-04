<script setup lang="ts">
/**
 * Right-click context menu for a graph fact node. Offers update + delete for
 * the `selectedFactId`. Opened imperatively by the parent via the exposed
 * {@link showFactNodeContextMenu}.
 */
import * as vNG from 'v-network-graph';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import DeleteFactComponent from '@/components/DeleteFactComponent.vue';
import ContextMenuRoot from '@/components/menus/ContextMenuRoot.vue';
import { useContextMenu } from '@/composables/useContextMenu';

const { menuEl, isOpen, pos, showContextMenu, hideMenu } = useContextMenu();

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
  selectedFactId: string | null;
}>();

const emit = defineEmits<{
  openUpdateFactDialog: [];
  deletedFactFromMenu: [deletedFactId: string];
}>();

function onUpdateClick() {
  if (!props.selectedFactId) return;
  emit('openUpdateFactDialog');
  hideMenu();
}

function onFactDeleted(deletedFactId: string) {
  emit('deletedFactFromMenu', deletedFactId);
  hideMenu();
}

/** Open the menu at the node event (suppressing the browser's native menu). */
function showFactNodeContextMenu(params: vNG.NodeEvent<MouseEvent>) {
  const { event } = params;
  event.stopPropagation();
  event.preventDefault();
  showContextMenu(event);
}

defineExpose({
  showFactNodeContextMenu,
  hideMenu,
});
</script>

<template>
  <ContextMenuRoot>
    <div
      ref="menuEl"
      class="dropdown fact-context-dropdown"
      :class="{ 'is-active': isOpen }"
      :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
    >
      <div class="dropdown-menu" role="menu">
        <div class="dropdown-content">
          <button
            id="fact-context-update-button"
            class="dropdown-item"
            type="button"
            @click="onUpdateClick"
            :disabled="!selectedFactId"
          >
            Update fact
          </button>

          <div class="dropdown-item dropdown-item--embedded">
            <DeleteFactComponent
              :loreWeaveApiService="loreWeaveApiService"
              :factId="selectedFactId"
              @deletedFact="onFactDeleted"
            />
          </div>
        </div>
      </div>
    </div>
  </ContextMenuRoot>
</template>

<style scoped>
.fact-context-dropdown {
  position: fixed;
  z-index: 1000;
}

.fact-context-dropdown .dropdown-content {
  background: #ffffff;
}

.fact-context-dropdown .dropdown-item {
  background: #ffffff;
  color: #111827;
}

.fact-context-dropdown .dropdown-item:hover {
  background: #f3f4f6;
  color: #111827;
}

.fact-context-dropdown .dropdown-item--embedded {
  padding: 0;
}

.fact-context-dropdown .dropdown-item--embedded > :deep(*) {
  margin: 0;
}

.fact-context-dropdown .dropdown-item--embedded :deep(button) {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0.375rem 1rem;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.fact-context-dropdown .dropdown-item--embedded :deep(button:hover:not(:disabled)) {
  background: #f3f4f6;
}

.fact-context-dropdown .dropdown-item--embedded :deep(button:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
