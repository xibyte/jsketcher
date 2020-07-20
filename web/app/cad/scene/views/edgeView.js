import {CurveBasedView} from './curveBasedView';

export class EdgeView extends CurveBasedView {
  
  constructor(edge) {
    let brepEdge = edge.brepEdge;
    let tess = brepEdge.data.tessellation ? brepEdge.data.tessellation : brepEdge.curve.tessellateToData();
    super(edge, tess, 2, 3, 0x2B3856, 0xd1726c);
  }
}
