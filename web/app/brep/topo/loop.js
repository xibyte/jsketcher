
export class Loop {

  constructor() {
    this.face = null;
    this.halfEdges = [];
  }

  asPolygon() {
    return this.halfEdges.map(e => e.vertexA.point);
  }
}