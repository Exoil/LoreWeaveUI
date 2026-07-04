import { describe, it, expect } from 'vitest';
import { FactNode } from '@/models/FactNode';
import { Fact } from '@/services/Models/Fact';

describe('FactNode', () => {
  it('copies id and uses the fact title as the node name', () => {
    const node = new FactNode(new Fact('fact-1', 'Bearer of the One Ring', 'Carried the Ring.'));

    expect(node.id).toBe('fact-1');
    expect(node.name).toBe('Bearer of the One Ring');
  });

  it('keeps the wrapped fact on factData', () => {
    const fact = new Fact('fact-1', 'Title', 'Content');
    const node = new FactNode(fact);

    expect(node.factData).toBe(fact);
    expect(node.factData.content).toBe('Content');
  });

  it('updateFact changes the label and the wrapped fact', () => {
    const node = new FactNode(new Fact('fact-1', 'Old title', 'Old content'));

    node.updateFact('New title', 'New content');

    expect(node.name).toBe('New title');
    expect(node.factData.title).toBe('New title');
    expect(node.factData.content).toBe('New content');
  });

  it('updateFact does not change the id', () => {
    const node = new FactNode(new Fact('fact-1', 'Title', 'Content'));

    node.updateFact('Other', 'Other');

    expect(node.id).toBe('fact-1');
    expect(node.factData.id).toBe('fact-1');
  });
});
