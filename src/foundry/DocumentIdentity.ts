/**
 * `{ id, name }` of a Foundry document, read defensively — hook payloads are
 * untyped and this module treats them like any other untrusted input.
 * Returns null when the payload is malformed.
 */
export function readDocumentIdentity(doc: unknown): { id: string; name: string } | null {
  const { id, name } = (doc ?? {}) as { id?: unknown; name?: unknown };
  if (typeof id !== 'string' || typeof name !== 'string') return null;
  return { id, name };
}
