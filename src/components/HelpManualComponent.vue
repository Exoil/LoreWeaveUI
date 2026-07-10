<script setup lang="ts">
/**
 * Read-only user manual explaining how to work with the graph. Opened from the
 * "Help" toolbar button; `v-model:open` controls visibility. Players see only
 * the viewing instructions — the editing sections are GM-only and hidden from
 * them, mirroring what the context menus actually offer each role.
 */
defineProps<{
  /** GM sees the editing/visibility sections; players only the viewing ones. */
  isGameMaster: boolean;
}>();

const open = defineModel<boolean>('open', { required: true });

function onClickClose() {
  open.value = false;
}
</script>

<template>
  <div class="modal" :class="{ 'is-active': open }">
    <div class="modal-background" @click="onClickClose"></div>
    <div class="modal-card help-manual-card">
      <header class="modal-card-head">
        <p id="help-manual-title" class="modal-card-title">How to use LoreWeave</p>
        <button
          id="help-manual-close-button"
          class="delete"
          type="button"
          aria-label="close"
          @click="onClickClose"
        ></button>
      </header>
      <section class="modal-card-body">
        <div class="content">
          <h5>Reading the graph</h5>
          <ul>
            <li>
              Circles are <strong>characters</strong>; squares are <strong>facts</strong> attached
              to them (see the legend in the corner for the colours).
            </li>
            <li>
              Arrows between characters are <strong>relations</strong> — who knows whom, with a
              short description on the edge.
            </li>
            <li>
              <strong>Scroll</strong> to zoom and <strong>drag the background</strong> to pan around
              the graph.
            </li>
            <li>
              <strong>Hover</strong> a fact to preview it; <strong>double-click</strong> a fact or a
              relation to open its full details.
            </li>
          </ul>

          <h5>Selecting</h5>
          <ul>
            <li>
              <strong>Click</strong> a node to select it. Clicking a second character selects it as
              well — two selected characters are needed to create or inspect a relation between
              them.
            </li>
            <li>
              <strong>Right-click</strong> a character, fact, relation, or the empty background to
              open the matching menu of actions.
            </li>
          </ul>

          <h5>Finding connections</h5>
          <ul>
            <li>
              Right-click a character and choose <strong>Search path to</strong> to highlight the
              shortest chain of relations leading to another character.
            </li>
            <li>
              Use the <strong>Clear path</strong> button (bottom-right) to remove the highlight.
            </li>
          </ul>

          <template v-if="isGameMaster">
            <h5>Building the world (GM only)</h5>
            <ul>
              <li>
                Right-click the empty background and choose <strong>Create character</strong>.
              </li>
              <li>
                Select two characters, then right-click and choose
                <strong>Create know edge</strong> to connect them with a relation.
              </li>
              <li>
                Right-click a character and choose <strong>Create fact</strong> to attach a note to
                them; a fact can be connected to more characters via
                <strong>Connect to character</strong>.
              </li>
              <li>
                <strong>Update</strong> and <strong>Delete</strong> live in the same right-click
                menus.
              </li>
              <li>
                Characters created from Foundry actors and facts from journal handouts appear
                automatically and stay in sync.
              </li>
            </ul>

            <h5>What players see (GM only)</h5>
            <ul>
              <li>
                Use <strong>Hide from players</strong> / <strong>Show for players</strong> in any
                right-click menu to control what players can see. Hiding a character also hides all
                of its relations.
              </li>
              <li>
                <strong>Drag nodes</strong> to arrange the graph — players see your layout live and
                cannot move anything themselves.
              </li>
              <li>
                <strong>Board settings</strong> (top-right) changes the board name, colours, and
                graph styling for everyone.
              </li>
            </ul>
          </template>
          <template v-else>
            <h5>Good to know</h5>
            <ul>
              <li>
                The graph is arranged by the Game Master — nodes cannot be moved, and new
                discoveries appear as the GM reveals them.
              </li>
            </ul>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.help-manual-card {
  /* Manual is text-heavy; keep it readable but never taller than the window. */
  max-height: 85%;
}
</style>
