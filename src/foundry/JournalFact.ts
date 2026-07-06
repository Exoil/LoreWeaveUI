import {
  FACT_TITLE_MAX_LENGTH,
  FACT_CONTENT_MAX_LENGTH,
  clampToLength,
} from '@/services/Models/ValidationRules';
import { readDocumentIdentity } from './DocumentIdentity';

/** Stand-in content for journals without any text yet (the contract requires 1+ chars). */
export const EMPTY_JOURNAL_FACT_CONTENT = '(empty handout)';

/**
 * A Foundry journal entry (handout) viewed as a graph-fact payload: the
 * journal's id for the document↔backend links, plus title and content already
 * fitted to the backend contract — title clamped to 1..100, content taken
 * from the first text page, clamped to 3000, with a placeholder for empty
 * journals (the contract refuses empty content).
 */
export class JournalFact {
  private constructor(
    /** Foundry journal-entry id (the `documentLinks.journals` key). */
    public readonly journalId: string,
    /** Fact title (the journal name), clamped to the contract limit. */
    public readonly title: string,
    /** Fact content (first text page / placeholder), clamped to the contract limit. */
    public readonly content: string,
  ) {}

  /** Build from an untyped JournalEntry hook document, or null when malformed. */
  static fromJournal(doc: unknown): JournalFact | null {
    const identity = readDocumentIdentity(doc);
    if (!identity) return null;
    return new JournalFact(
      identity.id,
      clampToLength(identity.name, FACT_TITLE_MAX_LENGTH),
      JournalFact.toFactContent(JournalFact.extractContent(doc)),
    );
  }

  /**
   * Build from an untyped JournalEntryPage hook document by resolving its
   * parent journal (the fact is linked to the *entry*, not the page), or null.
   */
  static fromPage(page: unknown): JournalFact | null {
    const journal = (page as { parent?: unknown } | null)?.parent;
    return JournalFact.fromJournal(journal);
  }

  /**
   * The raw content of a journal: the first page with text content (Foundry
   * v10+ journals are page collections), or '' for empty journals.
   */
  private static extractContent(journal: unknown): string {
    const pages = (journal as { pages?: { contents?: unknown[] } } | null)?.pages?.contents;
    if (!Array.isArray(pages)) return '';
    for (const page of pages) {
      const content = (page as { text?: { content?: unknown } } | null)?.text?.content;
      if (typeof content === 'string' && content.length > 0) return content;
    }
    return '';
  }

  /** Fit raw journal text into the fact-content contract (1..3000). */
  private static toFactContent(raw: string): string {
    if (raw.length === 0) return EMPTY_JOURNAL_FACT_CONTENT;
    return clampToLength(raw, FACT_CONTENT_MAX_LENGTH);
  }
}
