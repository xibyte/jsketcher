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
    if (isNaN(delta)) {
      return;
    }

    const edges = [];
    const startPoint = findLowestPoint(loopPoints);
    const start = loopPoints.indexOf(startPoint);
    if (start == -1) {
      return;
    }

    function pos(i) {
      return (i + start) % length;
    }

    const inverse = this.twoConnectedArcs() || !math.isCCW([loopPoints[pos(0)], loopPoints[pos(1)], loopPoints[pos(length - 1)]]);
    if (inverse) {
      delta *= -1;
    }

    const pm = this.viewer.parametricManager;
    const offsetConstant = createOffsetConstant(pm, delta);
    for (let i = 0; i < length; ++i) {
      let a = loopPoints[pos(i)];
      let b = loopPoints[pos(i + 1)];
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
        pm._add(new Constraints.Parallel(origEdge, segment));
        pm._add(new Constraints.P2LDistanceSigned(a, segment.b, segment.a, offsetConstant));
        edges.push(segment);
      } else if (origEdge._class == 'TCAD.TWO.Arc') {
        const connectionEdge = new SimpleEdge(new EndPoint(aOffX, aOffY), new EndPoint(bOffX, bOffY));
        edges.push(connectionEdge);
        const arcEdge = inverse ? connectionEdge.reverse() : connectionEdge;
        const arc = new Arc(
          arcEdge.a,
          arcEdge.b,
          new EndPoint(origEdge.c.x + offVector.x, origEdge.c.y + offVector.y)
        );
        arc.stabilize(this.viewer);
        pm._linkObjects([arc.c, origEdge.c]);
        pm._add(new Constraints.RadiusOffset(inverse?arc:origEdge, inverse?origEdge:arc, offsetConstant));
        this.viewer.activeLayer.add(arc);
      }
    }

    for (let i = 0; i < edges.length; i++) {
      pm._linkObjects([edges[i].b, edges[(i + 1) % edges.length].a]);
    }
    pm.solve(undefined, undefined, loopEdges);
    pm.refresh();
    this.viewer.toolManager.releaseControl();
  }
  
  twoConnectedArcs() {
    function isArc(edge) {
      return edge._class == 'TCAD.TWO.Arc';
    }
    const edges = this.pickedLoop.edges;
    return edges.length == 2 && isArc(edges[0]) && isArc(edges[1]);
  }
}


function segmentToVector(segment) {
  return new Vector(segment.b.x - segment.a.x, segment.b.y - segment.a.y);
}

const SUPPORTED_OBJECTS = new Set();
SUPPORTED_OBJECTS.add('TCAD.TWO.Segment');
SUPPORTED_OBJECTS.add('TCAD.TWO.Arc');

function SimpleEdge(a, b) {
  this.a = a;
  this.b = b;
  this.reverse = function() {
    return new SimpleEdge(b, a);
  }
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

function createOffsetConstant(pm, value) {
  let constant;
  let i = 0;
  do {
    constant = 'OFFSET' + i++;
  } while (pm.constantTable[constant]);
  pm.defineNewConstant(constant, value);
  return constant;
}