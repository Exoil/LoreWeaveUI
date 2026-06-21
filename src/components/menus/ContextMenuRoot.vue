<script setup lang="ts">
/**
 * Shared teleport host for the graph context menus. Each dropdown must escape
 * both the v-network-graph SVG and the Foundry window, so it is teleported to
 * `<body>`. The wrapper keeps the `.loreweaveui-root` class so the bundled Bulma
 * styles still cascade onto the teleported dropdown.
 *
 * `display: contents` stops the wrapper generating its own box. In the Foundry
 * build postcss-prefix-selector collapses Bulma's html/body reset (background,
 * min-width, overflow) onto `.loreweaveui-root`; without `display: contents`
 * the teleported wrapper would become a stray block in Foundry's `<body>` and
 * shove the sidebar aside.
 */
</script>

<template>
  <Teleport to="body">
    <div class="loreweaveui-root">
      <slot />
    </div>
  </Teleport>
</template>

<style scoped>
.loreweaveui-root {
  display: contents;
}
</style>
