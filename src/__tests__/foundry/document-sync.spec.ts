import { describe, it, expect } from 'vitest';
import {
  parseDocumentLinks,
  extractJournalContent,
  readPageParentJournal,
  toFactContent,
  parseGraphChangeSignal,
  EMPTY_JOURNAL_FACT_CONTENT,
} from '@/foundry/document-sync';
import { FACT_CONTENT_MAX_LENGTH } from '@/services/Models/ValidationRules';

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

describe('extractJournalContent', () => {
  it('returns the first page with text content', () => {
    const journal = {
      pages: {
        contents: [
          { text: {} },
          { text: { content: '<p>The secret history</p>' } },
          { text: { content: 'later page' } },
        ],
      },
    };

    expect(extractJournalContent(journal)).toBe('<p>The secret history</p>');
  });

  it('returns an empty string for journals without text pages', () => {
    expect(extractJournalContent({ pages: { contents: [] } })).toBe('');
    expect(extractJournalContent({ pages: { contents: [{ image: {} }] } })).toBe('');
    expect(extractJournalContent({})).toBe('');
    expect(extractJournalContent(null)).toBe('');
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

describe('toFactContent', () => {
  it('passes normal content through unchanged', () => {
    expect(toFactContent('<p>The secret history</p>')).toBe('<p>The secret history</p>');
  });

  it('replaces empty content with the placeholder (contract requires 1+ chars)', () => {
    expect(toFactContent('')).toBe(EMPTY_JOURNAL_FACT_CONTENT);
  });

  it('truncates oversized content to the contract limit', () => {
    const oversized = 'x'.repeat(FACT_CONTENT_MAX_LENGTH + 500);

    const content = toFactContent(oversized);

    expect(content).toHaveLength(FACT_CONTENT_MAX_LENGTH);
    expect(content).toBe(oversized.slice(0, FACT_CONTENT_MAX_LENGTH));
  });
});

describe('readPageParentJournal', () => {
  it('returns the parent journal identity and document', () => {
    const journal = { id: 'journal-1', name: 'Handout', pages: { contents: [] } };
    const page = { id: 'page-1', name: 'Page 1', parent: journal };

    const parent = readPageParentJournal(page);

    expect(parent).not.toBeNull();
    expect(parent!.id).toBe('journal-1');
    expect(parent!.name).toBe('Handout');
    expect(parent!.journal).toBe(journal);
  });

  it('returns null for pages without a well-formed parent', () => {
    expect(readPageParentJournal({ id: 'page-1', parent: null })).toBeNull();
    expect(readPageParentJournal({ id: 'page-1', parent: { id: 42 } })).toBeNull();
    expect(readPageParentJournal({})).toBeNull();
    expect(readPageParentJournal(null)).toBeNull();
  });
});
