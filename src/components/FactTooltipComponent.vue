<script setup lang="ts">
/**
 * Hover tooltip for a graph fact node: shows the fact's title and content next
 * to the cursor. Opened/closed imperatively by the graph interaction handlers
 * via the exposed {@link showFactTooltip} / {@link hideFactTooltip} (same
 * pattern as the context menus).
 */
import { ref } from 'vue';
import type * as vNG from 'v-network-graph';
import type { Fact } from '@/services/Models/Fact';
import ContextMenuRoot from '@/components/menus/ContextMenuRoot.vue';

const props = defineProps<{
  /** Resolves a fact-node id to its domain fact (from `useGraphData`). */
  getFactById: (id: string) => Fact | undefined;
}>();

// Offset so the card does not sit under the pointer (which would immediately
// fire pointerout on the node and flicker the tooltip).
const CURSOR_OFFSET_PX = 14;

const isVisible = ref(false);
const fact = ref<Fact | null>(null);
const pos = ref({ x: 0, y: 0 });

/** Show the tooltip for the hovered fact node, next to the pointer. */
function showFactTooltip(params: vNG.NodeEvent<PointerEvent>): void {
  const hoveredFact = props.getFactById(params.node);
  if (!hoveredFact) return;

  fact.value = hoveredFact;
  pos.value = {
    x: params.event.clientX + CURSOR_OFFSET_PX,
    y: params.event.clientY + CURSOR_OFFSET_PX,
  };
  isVisible.value = true;
}

/** Hide the tooltip (pointer left the node, or a click/menu took over). */
function hideFactTooltip(): void {
  isVisible.value = false;
}

defineExpose({
  showFactTooltip,
  hideFactTooltip,
});
</script>

<template>
  <ContextMenuRoot>
    <div
      v-if="isVisible && fact"
      id="fact-tooltip"
      class="box fact-tooltip"
      :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
    >
      <p id="fact-tooltip-title" class="has-text-weight-semibold">{{ fact.title }}</p>
      <p id="fact-tooltip-content" class="fact-tooltip-content">{{ fact.content }}</p>
    </div>
  </ContextMenuRoot>
</template>

<style scoped>
.fact-tooltip {
  position: fixed;
  z-index: 1000;
  max-width: 20rem;
  padding: 0.75rem;
  background: #ffffff;
  color: #111827;
  /* Purely informational — never steal the pointer from the graph. */
  pointer-events: none;
}

.fact-tooltip-content {
  /* Long fact content is clamped here; the full text lives in the details
     window opened by double-clicking the node. */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
  line-clamp: 6;
  overflow: hidden;
  white-space: pre-wrap;
}
</style>
