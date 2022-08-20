import {CurveBasedView} from './curveBasedView';
import {ViewMode} from "cad/scene/viewer";

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
    const brepEdge = edge.brepEdge;
    const tess = brepEdge.data.tessellation ? brepEdge.data.tessellation : brepEdge.curve.tessellateToData();
    super(ctx, edge, tess, 3, 0x000000, MarkerTable);
    this.addDisposer(ctx.viewer.viewMode$.attach(mode => {
      this.representation.visible = (mode === ViewMode.SHADED_WITH_EDGES || mode === ViewMode.WIREFRAME);
    }));
  }
}
