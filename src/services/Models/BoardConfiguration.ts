/**
 * Per-board visual configuration of the graph, mirroring the backend's
 * `BoardConfigurationDto`. Colours are 6-digit hex strings; the remaining
 * fields map onto v-network-graph view options (see useGraphConfiguration).
 */
export class BoardConfiguration {
  /** Fill colour of character nodes (hex, e.g. "#4466cc"). */
  public characterNodeColor: string;
  /** Fill colour of fact nodes (hex). */
  public factNodeColor: string;
  /** Colour of character→character relation edges (hex). */
  public relationEdgeColor: string;
  /** Colour of character→fact connection edges (hex). */
  public factEdgeColor: string;
  /** Colour of nodes/edges on a found relation path (hex). */
  public pathHighlightColor: string;
  /** Radius of character nodes in pixels (fact nodes scale down proportionally). */
  public nodeRadius: number;
  /** Stroke width of relation edges in pixels. */
  public edgeWidth: number;
  /** Render edges as curves (true) or straight lines (false). */
  public curvedEdges: boolean;
  /** Whether the background grid is visible. */
  public showGrid: boolean;
  /** Whether zooming scales nodes/edges/labels together like a map. */
  public scalingObjects: boolean;

  constructor(
    characterNodeColor: string,
    factNodeColor: string,
    relationEdgeColor: string,
    factEdgeColor: string,
    pathHighlightColor: string,
    nodeRadius: number,
    edgeWidth: number,
    curvedEdges: boolean,
    showGrid: boolean,
    scalingObjects: boolean,
  ) {
    this.characterNodeColor = characterNodeColor;
    this.factNodeColor = factNodeColor;
    this.relationEdgeColor = relationEdgeColor;
    this.factEdgeColor = factEdgeColor;
    this.pathHighlightColor = pathHighlightColor;
    this.nodeRadius = nodeRadius;
    this.edgeWidth = edgeWidth;
    this.curvedEdges = curvedEdges;
    this.showGrid = showGrid;
    this.scalingObjects = scalingObjects;
  }

  /**
   * The styling every board starts with — identical to the graph's historical
   * hard-coded palette so existing boards look unchanged until the GM
   * customises them.
   */
  public static createDefault(): BoardConfiguration {
    return new BoardConfiguration(
      '#4466cc',
      '#d97706',
      '#aaaaaa',
      '#d9a066',
      '#a855f7',
      16,
      3,
      true,
      true,
      true,
    );
  }

  /** Independent copy, so a form can edit without mutating the source. */
  public clone(): BoardConfiguration {
    return new BoardConfiguration(
      this.characterNodeColor,
      this.factNodeColor,
      this.relationEdgeColor,
      this.factEdgeColor,
      this.pathHighlightColor,
      this.nodeRadius,
      this.edgeWidth,
      this.curvedEdges,
      this.showGrid,
      this.scalingObjects,
    );
  }
}
