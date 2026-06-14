import { computed, ref, watch } from 'vue';
import type { Character } from '@/services/Models/Character';
import type { RpgAssistantService } from '@/services/RpgAssistantService';

export interface UsePaginatedCharacterSearchOptions {
  pageSize?: number;
  debounceMs?: number;
  excludeId?: () => string | null | undefined;
}

export function usePaginatedCharacterSearch(
  service: RpgAssistantService,
  options: UsePaginatedCharacterSearchOptions = {},
) {
  const pageSize = options.pageSize ?? 10;
  const debounceMs = options.debounceMs ?? 250;

  const query = ref('');
  const items = ref<Character[]>([]);
  const loading = ref(false);
  const hasMore = ref(false);
  const pageNumber = ref(1);

  let controller: AbortController | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const filteredItems = computed<Character[]>(() => {
    const excluded = options.excludeId?.();
    if (!excluded) return items.value;
    return items.value.filter((c) => c.id !== excluded);
  });

  function reset() {
    controller?.abort();
    controller = null;
    items.value = [];
    pageNumber.value = 1;
    hasMore.value = false;
    loading.value = false;
  }

  async function fetchPage(page: number) {
    controller?.abort();
    controller = new AbortController();
    loading.value = true;
    try {
      const result = await service.searchCharactersByNameAsync(
        query.value,
        page,
        pageSize,
        controller.signal,
      );
      if (page === 1) {
        items.value = result;
      } else {
        items.value = [...items.value, ...result];
      }
      hasMore.value = result.length === pageSize;
      pageNumber.value = page;
    } catch (err) {
      if ((err as { name?: string }).name === 'CanceledError') return;
      if ((err as { name?: string }).name === 'AbortError') return;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function loadMore() {
    if (loading.value || !hasMore.value) return;
    await fetchPage(pageNumber.value + 1);
  }

  watch(query, (next) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!next || next.trim().length === 0) {
      reset();
      return;
    }
    debounceTimer = setTimeout(() => {
      reset();
      void fetchPage(1);
    }, debounceMs);
  });

  function cancel() {
    if (debounceTimer) clearTimeout(debounceTimer);
    controller?.abort();
  }

  return {
    query,
    items: filteredItems,
    loading,
    hasMore,
    pageNumber,
    loadMore,
    reset,
    cancel,
  };
}
