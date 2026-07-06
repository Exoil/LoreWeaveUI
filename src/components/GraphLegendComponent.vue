<script setup lang="ts">
/**
 * Collapsible colour legend for the graph, anchored to the bottom-left corner.
 * The swatches are driven by {@link GRAPH_PALETTE} so they can never drift
 * from the actual graph styling. The "Hidden from players" section describes
 * the GM-only washed-out colours and is rendered exclusively for the GM —
 * players never learn that hiding exists.
 */
import { computed, ref } from 'vue';
import {
  GRAPH_PALETTE,
  WEAK_EDGE_DASHARRAY,
  FACT_EDGE_DASHARRAY,
} from '@/composables/useGraphConfiguration';

const props = defineProps<{
  isGameMaster: boolean;
}>();

const open = ref(false);
function toggleLegend() {
  open.value = !open.value;
}

/** One legend row: a node dot, a selection ring, or an edge line sample. */
interface LegendEntry {
  id: string;
  label: string;
  swatch: 'node' | 'ring' | 'line';
  color: string;
  /** Node swatches: render at the smaller fact-node size. */
  small?: boolean;
  /** Line swatches: SVG dash pattern (solid when omitted). */
  dash?: string;
  /** Line swatches: stroke width (defaults to the regular edge width). */
  width?: number;
}

interface LegendSection {
  title: string;
  entries: LegendEntry[];
}

const sections = computed<LegendSection[]>(() => {
  const base: LegendSection[] = [
    {
      title: 'Nodes',
      entries: [
        {
          id: 'character-node',
          label: 'Character',
          swatch: 'node',
          color: GRAPH_PALETTE.characterNode,
        },
        {
          id: 'fact-node',
          label: 'Fact',
          swatch: 'node',
          color: GRAPH_PALETTE.factNode,
          small: true,
        },
        {
          id: 'path-node',
          label: 'On found path',
          swatch: 'node',
          color: GRAPH_PALETTE.pathHighlight,
        },
        {
          id: 'first-selected',
          label: 'First selected',
          swatch: 'ring',
          color: GRAPH_PALETTE.firstSelectedStroke,
        },
        {
          id: 'second-selected',
          label: 'Second selected',
          swatch: 'ring',
          color: GRAPH_PALETTE.secondSelectedStroke,
        },
        {
          id: 'fact-selected',
          label: 'Selected fact',
          swatch: 'ring',
          color: GRAPH_PALETTE.factSelectedStroke,
        },
      ],
    },
    {
      title: 'Relations',
      entries: [
        {
          id: 'strong-relation',
          label: 'Strong relation',
          swatch: 'line',
          color: GRAPH_PALETTE.relationEdge,
        },
        {
          id: 'weak-relation',
          label: 'Weak relation',
          swatch: 'line',
          color: GRAPH_PALETTE.relationEdge,
          dash: WEAK_EDGE_DASHARRAY,
        },
        {
          id: 'selected-pair-edge',
          label: 'Between selected pair',
          swatch: 'line',
          color: GRAPH_PALETTE.selectedPairEdge,
          width: 5,
        },
        {
          id: 'path-edge',
          label: 'On found path',
          swatch: 'line',
          color: GRAPH_PALETTE.pathHighlight,
          width: 5,
        },
        {
          id: 'fact-edge',
          label: 'Fact connection',
          swatch: 'line',
          color: GRAPH_PALETTE.factEdge,
          dash: FACT_EDGE_DASHARRAY,
          width: 2,
        },
      ],
    },
  ];

  if (props.isGameMaster) {
    base.push({
      title: 'Hidden from players (GM only)',
      entries: [
        {
          id: 'hidden-character',
          label: 'Hidden character',
          swatch: 'node',
          color: GRAPH_PALETTE.hiddenNode,
        },
        {
          id: 'hidden-fact',
          label: 'Hidden fact',
          swatch: 'node',
          color: GRAPH_PALETTE.hiddenFactNode,
          small: true,
        },
        {
          id: 'hidden-edge',
          label: 'Hidden relation / connection',
          swatch: 'line',
          color: GRAPH_PALETTE.hiddenEdge,
        },
      ],
    });
  }

  return base;
});
</script>

<template>
  <div class="graph-legend">
    <button
      id="graph-legend-toggle-button"
      class="button is-small"
      type="button"
      @click="toggleLegend"
    >
      {{ open ? 'Hide legend' : 'Legend' }}
    </button>

    <div v-if="open" id="graph-legend-panel" class="legend-panel">
      <section v-for="section in sections" :key="section.title" class="legend-section">
        <p class="legend-section-title">{{ section.title }}</p>
        <ul>
          <li
            v-for="entry in section.entries"
            :id="`graph-legend-${entry.id}`"
            :key="entry.id"
            class="legend-entry"
          >
            <span class="legend-swatch">
              <span
                v-if="entry.swatch === 'node'"
                class="legend-node"
                :class="{ 'legend-node--small': entry.small }"
                :style="{ backgroundColor: entry.color }"
              />
              <span
                v-else-if="entry.swatch === 'ring'"
                class="legend-ring"
                :style="{ borderColor: entry.color }"
              />
              <svg v-else viewBox="0 0 40 10" width="40" height="10" aria-hidden="true">
                <line
                  x1="2"
                  y1="5"
                  x2="38"
                  y2="5"
                  :stroke="entry.color"
                  :stroke-width="entry.width ?? 3"
                  :stroke-dasharray="entry.dash"
                />
              </svg>
            </span>
            <span class="legend-label">{{ entry.label }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.graph-legend {
  position: absolute;
  left: 1rem;
  bottom: 1rem;
  z-index: 500;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-start;
  gap: 0.5rem;
}

#graph-legend-toggle-button {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.legend-panel {
  background: #ffffff;
  border: 1px solid rgba(10, 10, 10, 0.12);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(10, 10, 10, 0.18);
  padding: 0.75rem 1rem;
  max-height: 60vh;
  overflow-y: auto;
  color: #111827;
}

.legend-section + .legend-section {
  margin-top: 0.75rem;
}

.legend-section-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.legend-entry {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.125rem 0;
  font-size: 0.85rem;
}

/* Fixed-width swatch column so the labels line up across entry kinds. */
.legend-swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
}

.legend-node {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.legend-node--small {
  width: 12px;
  height: 12px;
}

.legend-ring {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 3px solid;
  background: transparent;
}
</style>
