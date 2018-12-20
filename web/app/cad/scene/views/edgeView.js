import {CurveBasedView} from './curveBasedView';

export class EdgeView extends CurveBasedView {
  
  constructor(edge) {
    let brepEdge = edge.brepEdge;
    let tess = brepEdge.data.tesselation ? brepEdge.data.tesselation : brepEdge.curve.tessellateToData();
    super(edge, tess, 1, 2, 0x2B3856, 0xd1726c);
  }
}
