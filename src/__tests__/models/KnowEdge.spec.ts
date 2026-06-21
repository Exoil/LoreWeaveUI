import { describe, it, expect } from 'vitest';
import { KnowEdge } from '@/models/KnowEdge';

describe('KnowEdge', () => {
  it('stores source and target', () => {
    const edge = new KnowEdge('char-1', 'char-2');

    expect(edge.source).toBe('char-1');
    expect(edge.target).toBe('char-2');
  });

  it('defaults description to empty and isStrongRelation to false', () => {
    const edge = new KnowEdge('char-1', 'char-2');

    expect(edge.description).toBe('');
    expect(edge.isStrongRelation).toBe(false);
  });

  it('stores description and isStrongRelation when provided', () => {
    const edge = new KnowEdge('char-1', 'char-2', 'sworn rivals', true);

    expect(edge.description).toBe('sworn rivals');
    expect(edge.isStrongRelation).toBe(true);
  });

  it('source and target are independent (not the same string)', () => {
    const edge = new KnowEdge('a', 'b');

    expect(edge.source).not.toBe(edge.target);
  });
});
