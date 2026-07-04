/**
 * A fact together with its `version` (the ETag from the response header),
 * required to perform a later concurrency-checked update.
 */
export class VersionedFact {
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
