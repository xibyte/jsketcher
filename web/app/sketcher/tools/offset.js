import {LoopPickTool} from './loop-pick'
import * as math from '../../math/math';

export class OffsetTool extends LoopPickTool {

  constructor(viewer) {
    super('offset', viewer);
  }

  onMousedown(e) {
    const delta = prompt('offset distance?');
    const offsetPolygon = math.polygonOffsetByDelta(this.pickedLoop, parseInt(delta));
    const length = offsetPolygon.length;
    const segments = [];
    for (let p = length - 1, q = 0; q < length; p = q++) {
      const a = offsetPolygon[p];
      const b = offsetPolygon[q];
      const segment = this.viewer.addSegment(a.x, a.y, b.x, b.y, this.viewer.activeLayer);
      segments.push(segment);
    }
    for (var i = 0; i < segments.length; i++) {
      this.viewer.parametricManager.linkObjects([segments[i].b, segments[(i + 1) % segments.length].a]);
    }
    this.viewer.toolManager.releaseControl();
    this.viewer.refresh();
  }
}
