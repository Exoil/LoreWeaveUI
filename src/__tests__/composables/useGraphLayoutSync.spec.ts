import { describe, it, expect, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import type * as vNG from 'v-network-graph';
import { useGraphLayoutSync, type GraphLayoutSyncChannel } from '@/composables/useGraphLayoutSync';

function makeChannel(overrides: Partial<GraphLayoutSyncChannel> = {}): GraphLayoutSyncChannel {
  return {
    broadcast: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    ...overrides,
  };
}

describe('useGraphLayoutSync (GM)', () => {
  it('broadcastLayouts pushes the current layout to the channel', () => {
    const channel = makeChannel();
    const layouts = ref<vNG.Layouts>({ nodes: { 'char-1': { x: 1, y: 2 } } });
    const { broadcastLayouts } = useGraphLayoutSync(layouts, channel, true);

    broadcastLayouts();

    expect(channel.broadcast).toHaveBeenCalledWith({ nodes: { 'char-1': { x: 1, y: 2 } } });
  });

  it('the GM does not subscribe to incoming layouts', () => {
    const channel = makeChannel();
    useGraphLayoutSync(ref<vNG.Layouts>({ nodes: {} }), channel, true);

    expect(channel.subscribe).not.toHaveBeenCalled();
  });
});

describe('useGraphLayoutSync (player)', () => {
  it('applies incoming layouts pinned so the force layout keeps them', () => {
    let push: ((layouts: vNG.Layouts) => void) | undefined;
    const channel = makeChannel({
      subscribe(onLayouts) {
        push = onLayouts;
        return () => undefined;
      },
    });
    const layouts = ref<vNG.Layouts>({ nodes: {} });
    useGraphLayoutSync(layouts, channel, false);

    push!({ nodes: { 'char-1': { x: 10, y: 20 } } });

    expect(layouts.value.nodes['char-1']).toEqual({ x: 10, y: 20, fixed: true });
  });

  it('broadcastLayouts is a no-op for players', () => {
    const channel = makeChannel();
    const { broadcastLayouts } = useGraphLayoutSync(
      ref<vNG.Layouts>({ nodes: {} }),
      channel,
      false,
    );

    broadcastLayouts();

    expect(channel.broadcast).not.toHaveBeenCalled();
  });

  it('unsubscribes when the hosting scope is disposed', () => {
    const unsubscribe = vi.fn();
    const channel = makeChannel({ subscribe: () => unsubscribe });
    const scope = effectScope();
    scope.run(() => useGraphLayoutSync(ref<vNG.Layouts>({ nodes: {} }), channel, false));

    scope.stop();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('useGraphLayoutSync (standalone, no channel)', () => {
  it('does nothing without a channel', () => {
    const { broadcastLayouts } = useGraphLayoutSync(ref<vNG.Layouts>({ nodes: {} }), null, true);

    expect(() => broadcastLayouts()).not.toThrow();
  });
});
