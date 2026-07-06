import { describe, it, expect } from 'vitest';
import { JournalFact, EMPTY_JOURNAL_FACT_CONTENT } from '@/foundry/JournalFact';
import { FACT_TITLE_MAX_LENGTH, FACT_CONTENT_MAX_LENGTH } from '@/services/Models/ValidationRules';

function makeJournal(name = 'Handout', pages: unknown[] = []) {
  return { id: 'journal-1', name, pages: { contents: pages } };
}

describe('JournalFact.fromJournal', () => {
  it('reads the journal identity, title and first text-page content', () => {
    const fact = JournalFact.fromJournal(
      makeJournal('Handout', [
        { text: {} },
        { text: { content: '<p>The secret history</p>' } },
        { text: { content: 'later page' } },
      ]),
    );

    expect(fact).not.toBeNull();
    expect(fact!.journalId).toBe('journal-1');
    expect(fact!.title).toBe('Handout');
    expect(fact!.content).toBe('<p>The secret history</p>');
  });

  it('uses the placeholder for journals without text (contract requires 1+ chars)', () => {
    expect(JournalFact.fromJournal(makeJournal())!.content).toBe(EMPTY_JOURNAL_FACT_CONTENT);
    expect(JournalFact.fromJournal(makeJournal('H', [{ image: {} }]))!.content).toBe(
      EMPTY_JOURNAL_FACT_CONTENT,
    );
  });

  it('clamps oversized title and content to the contract limits', () => {
    const fact = JournalFact.fromJournal(
      makeJournal('t'.repeat(FACT_TITLE_MAX_LENGTH + 10), [
        { text: { content: 'c'.repeat(FACT_CONTENT_MAX_LENGTH + 10) } },
      ]),
    );

    expect(fact!.title).toHaveLength(FACT_TITLE_MAX_LENGTH);
    expect(fact!.content).toHaveLength(FACT_CONTENT_MAX_LENGTH);
  });

  it('returns null for malformed hook payloads', () => {
    expect(JournalFact.fromJournal(null)).toBeNull();
    expect(JournalFact.fromJournal({})).toBeNull();
    expect(JournalFact.fromJournal({ id: 42, name: 'Handout' })).toBeNull();
  });
});

describe('JournalFact.fromPage', () => {
  it('resolves the parent journal of a page document', () => {
    const journal = makeJournal('Handout', [{ text: { content: 'lore' } }]);

    const fact = JournalFact.fromPage({ id: 'page-1', name: 'Page 1', parent: journal });

    expect(fact).not.toBeNull();
    expect(fact!.journalId).toBe('journal-1');
    expect(fact!.content).toBe('lore');
  });

  it('returns null for pages without a well-formed parent', () => {
    expect(JournalFact.fromPage({ id: 'page-1', parent: null })).toBeNull();
    expect(JournalFact.fromPage({ id: 'page-1', parent: { id: 42 } })).toBeNull();
    expect(JournalFact.fromPage({})).toBeNull();
    expect(JournalFact.fromPage(null)).toBeNull();
  });
});
