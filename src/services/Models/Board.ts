import { BoardConfiguration } from './BoardConfiguration';

/**
 * A board — one graph per RPG game. Carries the board's name and its visual
 * {@link BoardConfiguration}. Every character/relation/fact request is scoped
 * to a board.
 */
export class Board {
  public id: string;
  public name: string;
  public configuration: BoardConfiguration;

  constructor(id: string, name: string, configuration: BoardConfiguration) {
    this.id = id;
    this.name = name;
    this.configuration = configuration;
  }
}
