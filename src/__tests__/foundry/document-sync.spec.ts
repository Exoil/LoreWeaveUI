import { describe, it, expect } from 'vitest';
import {
  parseDocumentLinks,
  extractJournalContent,
  readPageParentJournal,
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
