---
paths:
  - 'src/components/**'
  - 'src/App.vue'
---

# Component rules

- `<script setup lang="ts">` only. Composition API.
- Declare contracts explicitly:
  ```ts
  const props = defineProps<{ rpgAssistantService: RpgAssistantService }>();
  const open = defineModel<boolean>('open', { required: true });
  const emit = defineEmits<{ characterCreated: [node: CharacterNode] }>();
  ```
- Inject the service via props (`rpgAssistantService`) — do not import a
  singleton inside the component.
- Async work uses an `AbortController` declared in the setup scope:
  ```ts
  let controller: AbortController | null = null;
  async function onClick() {
    controller?.abort();
    controller = new AbortController();
    await props.rpgAssistantService.fooAsync(..., controller.signal);
  }
  onBeforeUnmount(() => controller?.abort());
  ```
- Styling uses **Bulma** utility classes first; add scoped `<style>` only when
  Bulma cannot express the layout. Keep component styles `scoped`.
- Give interactive elements stable `id` attributes when they are likely to be
  targeted by tests (`#create-character-node-submit-button`, etc.).
