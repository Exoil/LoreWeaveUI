<script setup lang="ts">
import * as vNG from 'v-network-graph';
import type { RpgAssistantService } from '@/services/RpgAssistantService';
import DeleteCharacterComponent from '@/components/DeleteCharacterComponent.vue';
import CreateCharacterKnowEdgeComponent from '@/components/CreateCharacterKnowEdgeComponent.vue';
import { useContextMenu } from '@/composables/useContextMenu';

const { menuEl, isOpen, pos, showContextMenu, hideMenu } = useContextMenu();

const props = defineProps<{
  rpgAssistantService: RpgAssistantService;
  firstSelectedCharacterId: string | null;
  secondSelectedCharacterId: string | null;
  edgeIdSeparator: string;
}>();

const emit = defineEmits<{
  openUpdateCharacterDialog: [];
  openFindPathDialog: [];
  deletedCharacterFromMenu: [deletedCharacterId: string];
  createKnowEdgeFromMenu: [createdEdgeId: string];
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

function onEdgeKnowCreated(createdEdgeId: string) {
  emit('createKnowEdgeFromMenu', createdEdgeId);
  hideMenu();
}

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
  <Teleport to="body">
    <div class="loreweaveui-root">
      <div
        ref="menuEl"
        class="dropdown node-context-dropdown"
        :class="{ 'is-active': isOpen }"
        :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
      >
        <div class="dropdown-menu" role="menu">
          <div class="dropdown-content">
            <button
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

            <div class="dropdown-item dropdown-item--embedded">
              <DeleteCharacterComponent
                :disabled="!firstSelectedCharacterId"
                :rpgAssistantService="rpgAssistantService"
                :characterId="firstSelectedCharacterId"
                @deletedCharacter="onCharacterDeleted"
              />
            </div>

            <div class="dropdown-item dropdown-item--embedded">
              <CreateCharacterKnowEdgeComponent
                :rpgAssistantService="rpgAssistantService"
                :fromNodeId="firstSelectedCharacterId"
                :targetNodeId="secondSelectedCharacterId"
                :edgeIdSeparator="edgeIdSeparator"
                @createKnowEdge="onEdgeKnowCreated"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
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
