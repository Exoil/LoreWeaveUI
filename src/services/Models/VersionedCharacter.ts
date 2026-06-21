/**
 * A character together with its `version` (the ETag from the response header).
 * The version is required to perform a later concurrency-checked update.
 */
export class VersionedCharacter {
  public id: string;
  public name: string;
  public version: string;

  constructor(id: string, name: string, version: string) {
    this.id = id;
    this.name = name;
    this.version = version;
  }
}
