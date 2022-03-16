import {CurveBasedView} from './curveBasedView';

const MarkerTable = [
  {
    type: 'selection',
    priority: 10,
    colors: [0xc42720],
  },
  {
    type: 'highlight',
    priority: 1,
    colors: [0xffebcd, 0xFF00FF],
  },
];

export class EdgeView extends CurveBasedView {
  
  constructor(ctx, edge) {
    let brepEdge = edge.brepEdge;
    let tess = brepEdge.data.tessellation ? brepEdge.data.tessellation : brepEdge.curve.tessellateToData();
    super(ctx, edge, tess, 2, 4, 0x2B3856, 0xc42720, false, MarkerTable);
  }
}
