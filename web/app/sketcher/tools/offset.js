import {LoopPickTool} from './loop-pick'
import {Constraints} from '../parametric'
import Vector from 'math/vector';
import {Arc} from '../shapes/arc'
import {isCCW} from "geom/euclidean";

export class OffsetTool extends LoopPickTool {

  constructor(viewer) {
    super('offset', viewer);
  }

  onMousedown(e) {
    const loopPoints = this.pickedLoop.points;
    const loopEdges = this.pickedLoop.edges;
    const length = loopEdges.length;

    for (const obj of loopEdges) {
      if (!SUPPORTED_OBJECTS.has(obj.TYPE)) {
        alert(obj._class + " isn't supported for offsets");
        return;
      }
    }
    const delta = parseInt(prompt('offset distance?', 100));
    if (isNaN(delta)) {
      return;
    }

    const edges = loopEdges.map(e => e.copy());

    const lowestPoint = findLowestPoint(loopPoints);
    const low = loopPoints.indexOf(lowestPoint);
    function pos(i) {
      return (i + low) % length;
    }
    
    const mainInverse = !this.twoConnectedArcs() && isCCW([loopPoints[pos(0)], loopPoints[pos(1)], loopPoints[pos(length - 1)]]);

    const pm = this.viewer.parametricManager;
    const offsetConstant = createOffsetConstant(pm, delta);
    for (let i = 0; i < length; ++i) {
      const edge = edges[i];
      const origEdge = loopEdges[i];
      const edgeInverse = loopPoints[i] !== origEdge.a;
      const inverse = mainInverse !== edgeInverse;
      
      this.viewer.activeLayer.add(edge);
      if (edge.TYPE === 'Segment') {
        pm._add(new Constraints.Parallel(origEdge, edge));
        pm._add(new Constraints.P2LDistanceSigned(origEdge.a, inverse?edge.b:edge.a, inverse?edge.a:edge.b, offsetConstant));
      } else if (edge.TYPE === 'Arc') {
        edge.stabilize(this.viewer);
        pm._linkObjects([edge.c, origEdge.c]);
        pm._add(new Constraints.RadiusOffset(inverse?origEdge:edge, inverse?edge:origEdge, offsetConstant));
      }
    }
    
    for (let i = 0; i < edges.length; i++) {
      const next = ((i + 1) % edges.length);
      if (loopEdges[i].a.linked.indexOf(loopEdges[next].a) !== -1) {
        pm._linkObjects([edges[i].a, edges[next].a]);
      } else if (loopEdges[i].a.linked.indexOf(loopEdges[next].b) !== -1) {
        pm._linkObjects([edges[i].a, edges[next].b]);
      } else if (loopEdges[i].b.linked.indexOf(loopEdges[next].a) !== -1) {
        pm._linkObjects([edges[i].b, edges[next].a]);
      } else if (loopEdges[i].b.linked.indexOf(loopEdges[next].b) !== -1) {
        pm._linkObjects([edges[i].b, edges[next].b]);
      }
    }
    pm.solve(undefined, undefined, loopEdges);
    pm.refresh();
    this.viewer.toolManager.releaseControl();
  }
  
  twoConnectedArcs() {
    function isArc(edge) {
      return edge._class === 'Arc';
    }
    const edges = this.pickedLoop.edges;
    return edges.length === 2 && isArc(edges[0]) && isArc(edges[1]);
  }
}


function segmentToVector(segment) {
  return new Vector(segment.b.x - segment.a.x, segment.b.y - segment.a.y);
}

const SUPPORTED_OBJECTS = new Set();
SUPPORTED_OBJECTS.add('Segment');
SUPPORTED_OBJECTS.add('Arc');

function SimpleEdge(a, b) {
  this.a = a;
  this.b = b;
  this.reverse = function() {
    return new SimpleEdge(b, a);
  }
}

function findLowestPoint(poly) {
  let hero = {x: Number.MAX_VALUE, y: Number.MAX_VALUE};
  for (const point of poly) {
    if (point.y < hero.y) {
      hero = point;
    } else if (hero.y == hero.y) { // TODO: revisit and fix bug
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