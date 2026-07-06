<script setup lang="ts">
/**
 * Right-click context menu for a graph edge. For a know edge (relation) it
 * offers update + delete; for a fact edge (`isFactEdge`) only "delete fact
 * edge" — the connection carries no properties, so there is nothing to update.
 * Opened imperatively by the parent via the exposed {@link showEdgeContextMenu}.
 */
import * as vNG from 'v-network-graph';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';
import DeleteKnowCharacterEdgeComponent from '@/components/DeleteKnowCharacterEdgeComponent.vue';
import DeleteFactEdgeComponent from '@/components/DeleteFactEdgeComponent.vue';
import ContextMenuRoot from '@/components/menus/ContextMenuRoot.vue';
import { useContextMenu } from '@/composables/useContextMenu';

const { menuEl, isOpen, pos, showContextMenu, hideMenu } = useContextMenu();

const props = defineProps<{
  loreWeaveApiService: LoreWeaveApiService;
  selectedEdgeId: string | undefined;
  edgeIdSeparator: string;
  isFactEdge: boolean;
  isGameMaster: boolean;
  isEdgeHidden: boolean;
  /**
   * The edge is hidden because one of its endpoint nodes is hidden. Its own
   * toggle would change nothing, so the menu disables it — visibility is
   * controlled from the node.
   */
  isEdgeHiddenViaNode: boolean;
}>();

const emit = defineEmits<{
  openUpdateKnowEdgeDialog: [];
  deleteKnowEdgeFromMenu: [createdEdgeId: string];
  deleteFactEdgeFromMenu: [deletedEdgeId: string];
  toggleEdgeVisibility: [];
}>();

function onUpdateClick() {
  if (!props.selectedEdgeId) return;
  emit('openUpdateKnowEdgeDialog');
  hideMenu();
}

function onEdgeKnowDeleted(deletedEdgeId: string) {
  emit('deleteKnowEdgeFromMenu', deletedEdgeId);
  hideMenu();
}

function onFactEdgeDeleted(deletedEdgeId: string) {
  emit('deleteFactEdgeFromMenu', deletedEdgeId);
  hideMenu();
}

function onToggleVisibilityClick() {
  if (!props.selectedEdgeId || props.isEdgeHiddenViaNode) return;
  emit('toggleEdgeVisibility');
  hideMenu();
}

/**
 * Open the menu at the edge event (suppressing the browser's native menu).
 * Every action here mutates data, so for players this is a no-op (relations
 * stay readable via double-click details).
 */
function showEdgeContextMenu(params: vNG.EdgeEvent<MouseEvent>) {
  if (!props.isGameMaster) return;
  const { event } = params;
  event.stopPropagation();
  event.preventDefault();
  showContextMenu(event);
}

defineExpose({
  showEdgeContextMenu,
  hideMenu,
});
</script>

<template>
  <ContextMenuRoot>
    <div
      ref="menuEl"
      class="dropdown context-dropdown"
      :class="{ 'is-active': isOpen }"
      :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
    >
      <div class="dropdown-menu" role="menu">
        <div class="dropdown-content">
          <template v-if="!isFactEdge">
            <button
              id="edge-context-update-button"
              class="dropdown-item"
              type="button"
              @click="onUpdateClick"
              :disabled="!selectedEdgeId"
            >
              Update relation
            </button>
            <div class="dropdown-item">
              <DeleteKnowCharacterEdgeComponent
                :loreWeaveApiService="loreWeaveApiService"
                :edgeId="selectedEdgeId"
                :edgeIdSeparator="edgeIdSeparator"
                @deletedKnowEdge="onEdgeKnowDeleted"
              />
            </div>
          </template>
          <div v-else class="dropdown-item">
            <DeleteFactEdgeComponent
              :loreWeaveApiService="loreWeaveApiService"
              :edgeId="selectedEdgeId"
              :edgeIdSeparator="edgeIdSeparator"
              @deletedFactEdge="onFactEdgeDeleted"
            />
          </div>

          <button
            v-if="isGameMaster"
            id="edge-context-toggle-visibility-button"
            class="dropdown-item"
            type="button"
            @click="onToggleVisibilityClick"
            :disabled="!selectedEdgeId || isEdgeHiddenViaNode"
          >
            {{
              isEdgeHiddenViaNode
                ? 'Hidden with a hidden node'
                : isEdgeHidden
                  ? 'Show for players'
                  : 'Hide from players'
            }}
          </button>
        </div>
      </div>
    </div>
  </ContextMenuRoot>
</template>

<style scoped>
.context-dropdown {
  position: fixed;
  z-index: 1000;
}

.context-dropdown .dropdown-menu {
  display: none;
  position: absolute;
  left: 0;
  top: 0;
  min-width: 12rem;
}

.context-dropdown.is-active .dropdown-menu {
  display: block;
}

.context-dropdown .dropdown-content {
  background: #ffffff;
  border: 1px solid rgba(10, 10, 10, 0.12);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(10, 10, 10, 0.18);
  padding: 0.25rem 0;
}

.context-dropdown .dropdown-item {
  background: #ffffff;
  color: #111827;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
}

.context-dropdown .dropdown-item:hover {
  background: #f3f4f6;
  color: #111827;
}
</style>
