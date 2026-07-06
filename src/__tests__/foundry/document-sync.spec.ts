import { describe, it, expect } from 'vitest';
import {
  parseDocumentLinks,
  parseGraphChangeSignal,
  findLinkedDocumentId,
} from '@/foundry/document-sync';

describe('parseDocumentLinks', () => {
  it('parses a well-formed value', () => {
    const links = parseDocumentLinks({
      actors: { 'actor-1': 'char-1' },
      journals: { 'journal-1': 'fact-1' },
      systemCharacterId: 'char-sys',
    });

    expect(links).toEqual({
      actors: { 'actor-1': 'char-1' },
      journals: { 'journal-1': 'fact-1' },
      systemCharacterId: 'char-sys',
    });
  });

  it('returns empty links for null / primitives / malformed shapes', () => {
    const empty = { actors: {}, journals: {}, systemCharacterId: '' };

    expect(parseDocumentLinks(null)).toEqual(empty);
    expect(parseDocumentLinks('nope')).toEqual(empty);
    expect(parseDocumentLinks({ actors: 'x', journals: 7 })).toEqual(empty);
  });

  it('drops non-string mapping values but keeps valid ones', () => {
    const links = parseDocumentLinks({
      actors: { 'actor-1': 'char-1', 'actor-2': 42 },
      journals: {},
      systemCharacterId: null,
    });

    expect(links.actors).toEqual({ 'actor-1': 'char-1' });
    expect(links.systemCharacterId).toBe('');
  });
});

describe('parseGraphChangeSignal', () => {
  it('parses a character change descriptor', () => {
    expect(
      parseGraphChangeSignal({
        revision: 4,
        change: { kind: 'character', action: 'created', characterId: 'c-1' },
      }),
    ).toEqual({
      revision: 4,
      change: { kind: 'character', action: 'created', characterId: 'c-1' },
    });
  });

  it('parses a fact change descriptor with its anchoring character', () => {
    expect(
      parseGraphChangeSignal({
        revision: 5,
        change: { kind: 'fact', action: 'created', factId: 'f-1', characterId: 'c-sys' },
      }),
    ).toEqual({
      revision: 5,
      change: { kind: 'fact', action: 'created', factId: 'f-1', characterId: 'c-sys' },
    });
  });

  it('parses a fact change descriptor without a character', () => {
    expect(
      parseGraphChangeSignal({
        revision: 6,
        change: { kind: 'fact', action: 'updated', factId: 'f-1' },
      }),
    ).toEqual({ revision: 6, change: { kind: 'fact', action: 'updated', factId: 'f-1' } });
  });

  it('treats a kind-less character descriptor from earlier builds as a character change', () => {
    expect(
      parseGraphChangeSignal({ revision: 3, change: { action: 'updated', characterId: 'c-1' } }),
    ).toEqual({
      revision: 3,
      change: { kind: 'character', action: 'updated', characterId: 'c-1' },
    });
  });

  it('treats a signal without a descriptor as a full refresh', () => {
    expect(parseGraphChangeSignal({ revision: 2, change: null })).toEqual({
      revision: 2,
      change: null,
    });
  });

  it('accepts the legacy plain-number shape from earlier builds', () => {
    expect(parseGraphChangeSignal(7)).toEqual({ revision: 7, change: null });
  });

  it('rejects malformed values into a safe full-refresh signal', () => {
    expect(parseGraphChangeSignal(null)).toEqual({ revision: 0, change: null });
    expect(parseGraphChangeSignal({ change: { action: 'exploded', characterId: 'c-1' } })).toEqual({
      revision: 0,
      change: null,
    });
    expect(parseGraphChangeSignal({ revision: 1, change: { action: 'created' } })).toEqual({
      revision: 1,
      change: null,
    });
    expect(
      parseGraphChangeSignal({ revision: 1, change: { kind: 'fact', action: 'created' } }),
    ).toEqual({ revision: 1, change: null });
  });
});

describe('findLinkedDocumentId', () => {
  it('finds the Foundry document id linked to a backend id', () => {
    const links = { 'actor-1': 'char-1', 'actor-2': 'char-2' };

    expect(findLinkedDocumentId(links, 'char-2')).toBe('actor-2');
  });

  it('returns undefined for backend ids without a link (graph-only entities)', () => {
    expect(findLinkedDocumentId({ 'actor-1': 'char-1' }, 'char-9')).toBeUndefined();
    expect(findLinkedDocumentId({}, 'char-1')).toBeUndefined();
  });
});
