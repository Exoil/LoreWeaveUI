import type { BoardConfiguration } from './BoardConfiguration';

/**
 * Payload for a concurrency-checked board update: new name + configuration
 * plus the `version` (ETag) the caller read the board at.
 */
export class UpdateBoard {
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
