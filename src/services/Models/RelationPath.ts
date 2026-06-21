/**
 * A path between two characters: the ordered `characterIds` walked through and
 * the number of `hops`. Empty when no path exists (see {@link isEmpty}).
 */
export class RelationPath {
  public characterIds: string[];
  public hops: number;

  constructor(characterIds: string[] = [], hops: number = 0) {
    this.characterIds = characterIds;
    this.hops = hops;
  }

  /** True when the path contains no characters (no route between the endpoints). */
  public get isEmpty(): boolean {
    return this.characterIds.length === 0;
  }
}
