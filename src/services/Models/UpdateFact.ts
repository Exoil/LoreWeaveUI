/**
 * Payload to edit a fact's `title` / `content`. `version` is the fact's ETag,
 * sent for an optimistic-concurrency check on the backend.
 */
export class UpdateFact {
  public id: string;
  public title: string;
  public content: string;
  public version: string;

  constructor(id: string, title: string, content: string, version: string) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.version = version;
  }
}
