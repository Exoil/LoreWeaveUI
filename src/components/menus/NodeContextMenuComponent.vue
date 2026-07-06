<script setup lang="ts">
/**
 * Right-click context menu for a graph node (character). Offers update, find-path,
 * delete, and create-relation actions; each is disabled unless the required
 * selection is present (the create-relation action needs two selected nodes).
 * Only the GM manages data: players see just the find-path action.
 * Opened imperatively by the parent via the exposed {@link showNodeContextMenu}.
 */
import * as vNG from 'v-network-graph';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import DeleteCharacterComponent from '@/components/DeleteCharacterComponent.vue';
import ContextMenuRoot from '@/components/menus/ContextMenuRoot.vue';
import { useContextMenu } from '@/composables/useContextMenu';

const { menuEl, isOpen, pos, showContextMenu, hideMenu } = useContextMenu();

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
  firstSelectedCharacterId: string | null;
  secondSelectedCharacterId: string | null;
  isGameMaster: boolean;
  isCharacterHidden: boolean;
}>();

const emit = defineEmits<{
  openUpdateCharacterDialog: [];
  openFindPathDialog: [];
  openCreateKnowEdgeDialog: [];
  openCreateFactDialog: [];
  deletedCharacterFromMenu: [deletedCharacterId: string];
  toggleCharacterVisibility: [];
}>();

function onUpdateClick() {
  if (!props.firstSelectedCharacterId) return;
  emit('openUpdateCharacterDialog');
  hideMenu();
}

function onFindPathClick() {
  if (!props.firstSelectedCharacterId) return;
  emit('openFindPathDialog');
  hideMenu();
}

function onCharacterDeleted(deletedCharacterId: string) {
  emit('deletedCharacterFromMenu', deletedCharacterId);
  hideMenu();
}

function onCreateKnowEdgeClick() {
  if (!props.firstSelectedCharacterId || !props.secondSelectedCharacterId) return;
  emit('openCreateKnowEdgeDialog');
  hideMenu();
}

function onCreateFactClick() {
  if (!props.firstSelectedCharacterId) return;
  emit('openCreateFactDialog');
  hideMenu();
}

function onToggleVisibilityClick() {
  if (!props.firstSelectedCharacterId) return;
  emit('toggleCharacterVisibility');
  hideMenu();
}

/** Open the menu at the node event (suppressing the browser's native menu). */
function showNodeContextMenu(params: vNG.NodeEvent<MouseEvent>) {
  const { event } = params;
  event.stopPropagation();
  event.preventDefault();
  showContextMenu(event);
}

defineExpose({
  showNodeContextMenu,
  hideMenu,
});
</script>

<template>
  <ContextMenuRoot>
    <div
      ref="menuEl"
      class="dropdown node-context-dropdown"
      :class="{ 'is-active': isOpen }"
      :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
    >
      <div class="dropdown-menu" role="menu">
        <div class="dropdown-content">
          <button
            v-if="isGameMaster"
            id="node-context-update-character-button"
            class="dropdown-item"
            type="button"
            @click="onUpdateClick"
            :disabled="!firstSelectedCharacterId"
          >
            Update character
          </button>

          <button
            id="node-context-find-path-button"
            class="dropdown-item"
            type="button"
            @click="onFindPathClick"
            :disabled="!firstSelectedCharacterId"
          >
            Search path to
          </button>

          <div v-if="isGameMaster" class="dropdown-item dropdown-item--embedded">
            <DeleteCharacterComponent
              :disabled="!firstSelectedCharacterId"
              :loreWeaveApiService="loreWeaveApiService"
              :characterId="firstSelectedCharacterId"
              @deletedCharacter="onCharacterDeleted"
            />
          </div>

          <button
            v-if="isGameMaster"
            id="node-context-create-know-edge-button"
            class="dropdown-item"
            type="button"
            @click="onCreateKnowEdgeClick"
            :disabled="!firstSelectedCharacterId || !secondSelectedCharacterId"
          >
            Create know edge
          </button>

          <button
            v-if="isGameMaster"
            id="node-context-create-fact-button"
            class="dropdown-item"
            type="button"
            @click="onCreateFactClick"
            :disabled="!firstSelectedCharacterId"
          >
            Create fact
          </button>

          <button
            v-if="isGameMaster"
            id="node-context-toggle-visibility-button"
            class="dropdown-item"
            type="button"
            @click="onToggleVisibilityClick"
            :disabled="!firstSelectedCharacterId"
          >
            {{ isCharacterHidden ? 'Show for players' : 'Hide from players' }}
          </button>
        </div>
      </div>
    </div>
  </ContextMenuRoot>
</template>

<style scoped>
.node-context-dropdown {
  position: fixed;
  z-index: 1000;
}

.node-context-dropdown .dropdown-content {
  background: #ffffff;
}

.node-context-dropdown .dropdown-item {
  background: #ffffff;
  color: #111827;
}

.node-context-dropdown .dropdown-item:hover {
  background: #f3f4f6;
  color: #111827;
}

.node-context-dropdown .dropdown-divider {
  background-color: #e5e7eb;
}

.node-context-dropdown .dropdown-item--embedded {
  padding: 0;
}

.node-context-dropdown .dropdown-item--embedded > :deep(*) {
  margin: 0;
}

.node-context-dropdown .dropdown-item--embedded :deep(button) {
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

.node-context-dropdown .dropdown-item--embedded :deep(button:hover:not(:disabled)) {
  background: #f3f4f6;
}

.node-context-dropdown .dropdown-item--embedded :deep(button:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
