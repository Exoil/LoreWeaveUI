/**
 * Payload to rename a character. `version` is the ETag last read for the
 * character; the backend uses it for an optimistic-concurrency check and rejects
 * the update if the character changed since.
 */
export class UpdateCharacter {
  public id: string;
  public name: string;
  public version: string;

  constructor(id: string, name: string, version: string) {
    this.id = id;
    this.name = name;
    this.version = version;
  }
}
