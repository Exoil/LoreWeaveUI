export class RelationPath {
  public characterIds: string[];
  public hops: number;

  constructor(characterIds: string[] = [], hops: number = 0) {
    this.characterIds = characterIds;
    this.hops = hops;
  }

  public get isEmpty(): boolean {
    return this.characterIds.length === 0;
  }
}
