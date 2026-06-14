import { describe, it, expect } from 'vitest';
import { KnowEdge } from '@/models/KnowEdge';

describe('KnowEdge', () => {
  it('stores source and target', () => {
    const edge = new KnowEdge('char-1', 'char-2');

    expect(edge.source).toBe('char-1');
    expect(edge.target).toBe('char-2');
  });

  it('source and target are independent (not the same string)', () => {
    const edge = new KnowEdge('a', 'b');

    expect(edge.source).not.toBe(edge.target);
  });
});
