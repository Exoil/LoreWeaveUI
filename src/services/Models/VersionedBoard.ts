import { BoardConfiguration } from './BoardConfiguration';

/**
 * A board together with its `version` (the ETag from the response header).
 * The version is required to perform a later concurrency-checked update.
 */
export class VersionedBoard {
  public id: string;
  public name: string;
  public configuration: BoardConfiguration;
  public version: string;

  constructor(id: string, name: string, configuration: BoardConfiguration, version: string) {
    this.id = id;
    this.name = name;
    this.configuration = configuration;
    this.version = version;
  }
}
