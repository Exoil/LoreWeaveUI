import { computed, ref, watch } from 'vue';
import type { Character } from '@/services/Models/Character';
import type { LoreWeaveApiService } from '@/services/LoreWeaveApiService';

export interface UsePaginatedCharacterSearchOptions {
  /** Page size for each backend request (default 10). */
  pageSize?: number;
  /** Debounce applied to the `query` ref before fetching (ms, default 250). */
  debounceMs?: number;
  /** Optional id to drop from results, e.g. the "from" character in path search. */
  excludeId?: () => string | null | undefined;
}

/**
 * Debounced, infinite-scroll character search backed by
 * {@link LoreWeaveApiService.searchCharactersByNameAsync}.
 *
 * Writing to the returned `query` ref triggers a debounced reset + fetch of
 * page 1; `loadMore()` appends the next page. Each fetch aborts the previous
 * in-flight request, and cancellation errors are swallowed.
 *
 * @param service the API service to query.
 * @param options page size, debounce, and an optional id to exclude.
 * @returns `query`, the (filtered) `items`, `loading` / `hasMore` flags,
 *   `loadMore`, and `reset` / `cancel` cleanup helpers.
 */
export function usePaginatedCharacterSearch(
  service: LoreWeaveApiService,
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

  /** Abort any in-flight request and clear results back to the empty state. */
  function reset() {
    controller?.abort();
    controller = null;
    items.value = [];
    pageNumber.value = 1;
    hasMore.value = false;
    loading.value = false;
  }

  /** Fetch one page; page 1 replaces results, later pages append. */
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

  /** Fetch and append the next page, unless already loading or at the end. */
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

  /** Cancel the pending debounce and abort any in-flight request (call on unmount). */
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
