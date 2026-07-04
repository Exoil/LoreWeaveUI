import { describe, it, expect } from 'vitest';
import { FactEdge } from '@/models/FactEdge';

describe('FactEdge', () => {
  it('stores the character as source and the fact as target', () => {
    const edge = new FactEdge('char-1', 'fact-1');

    expect(edge.source).toBe('char-1');
    expect(edge.target).toBe('fact-1');
  });

  it('source and target are independent (not the same string)', () => {
    const edge = new FactEdge('a', 'b');

    expect(edge.source).not.toBe(edge.target);
  });
});
