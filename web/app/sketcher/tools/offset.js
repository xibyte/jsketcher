import {LoopPickTool} from './loop-pick'
import {Constraints} from '../parametric'
import * as math from '../../math/math';
import Vector from '../../math/vector';
import {swap} from '../../utils/utils'
import ClipperLib from '../../../lib/clipper'
import {EndPoint} from '../shapes/point'
import {Arc} from '../shapes/arc'

export class OffsetTool extends LoopPickTool {

  constructor(viewer) {
    super('offset', viewer);
  }

  onMousedown(e) {
    const loopPoints = this.pickedLoop.points;
    const loopEdges = this.pickedLoop.edges;
    const length = loopPoints.length;

    for (let obj of loopEdges) {
      if (!SUPPORTED_OBJECTS.has(obj._class)) {
        alert(obj._class + " isn't supported for offsets");
        return;
      }
    }
    let delta = parseInt(prompt('offset distance?', 100));
    const absDelta = Math.abs(delta);
    
    const edges = [];
    const startPoint = findLowestPoint(loopPoints);
    const start = loopPoints.indexOf(startPoint);
    if (start == -1) {
      return;
    }

    function pos(i) {
      return (i + start) % length;
    }

    if (!math.isCCW([loopPoints[pos(0)], loopPoints[pos(1)], loopPoints[pos(length - 1)]])) {
      delta *= -1;
    }
    
    const arcs = [];
    
    for (let i = 0; i < length; ++i) {
      const a = loopPoints[pos(i)];
      const b = loopPoints[pos(i + 1)];
      const normal = new Vector(-(b.y - a.y), (b.x - a.x))._normalize();
      const offVector = normal._multiply(delta);
      const origEdge = loopEdges[pos(i)];
      const aOffX = a.x + offVector.x;
      const aOffY = a.y + offVector.y;
      const bOffX = b.x + offVector.x;
      const bOffY = b.y + offVector.y;
      if (origEdge._class == 'TCAD.TWO.Segment') {
        const segment = this.viewer.addSegment(aOffX, aOffY, 
                                               bOffX, bOffY, this.viewer.activeLayer);
        this.viewer.parametricManager._add(new Constraints.Parallel(origEdge, segment));
        this.viewer.parametricManager._add(new Constraints.P2LDistance(a, segment, absDelta));
        edges.push(segment);
      } else if (origEdge._class == 'TCAD.TWO.Arc') {
        const arc = new Arc(
          new EndPoint(aOffX, aOffY),
          new EndPoint(bOffX, bOffY),
          new EndPoint(origEdge.c.x + offVector.x, origEdge.c.y + offVector.y)
        );
        arc.stabilize(this.viewer);
        this.viewer.parametricManager._linkObjects([origEdge.c, arc.c]);
        this.viewer.parametricManager._add(new Constraints.RadiusOffset(origEdge, arc, delta));
        this.viewer.activeLayer.add(arc);
        edges.push(arc);
        arcs.push(arc);
      }
    }

    arcs.forEach(e => e.c.aux = true);
    for (let i = 0; i < edges.length; i++) {
      this.viewer.parametricManager._linkObjects([edges[i].b, edges[(i + 1) % edges.length].a]);
    }
    loopEdges.forEach(e => e.aux = true);
    this.viewer.parametricManager.refresh();
    loopEdges.forEach(e => e.aux = false);
    arcs.forEach(e => e.c.aux = false);
    this.viewer.toolManager.releaseControl();
  }
}


function segmentToVector(segment) {
  return new Vector(segment.b.x - segment.a.x, segment.b.y - segment.a.y);
}

const SUPPORTED_OBJECTS = new Set();
SUPPORTED_OBJECTS.add('TCAD.TWO.Segment');
SUPPORTED_OBJECTS.add('TCAD.TWO.Arc');

function SimpleSegment(a, b) {
  this.a = a;
  this.b = b;
}

function findLowestPoint(poly) {
  let hero = {x: Number.MAX_VALUE, y: Number.MAX_VALUE};
  for (let point of poly) {
    if (point.y < hero.y) {
      hero = point;
    } else if (hero.y == hero.y) {
      if (point.x < hero.x) {
        hero = point;
      }
    }
  }  
  return hero;
}