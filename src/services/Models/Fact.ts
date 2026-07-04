/**
 * A fact attached to a character via a HAS_FACT connection: a short `title`
 * (shown as the fact node's label) and the free-text `content`.
 */
export class Fact {
  public id: string;
  public title: string;
  public content: string;

  constructor(id: string, title: string, content: string) {
    this.id = id;
    this.title = title;
    this.content = content;
  }
}
