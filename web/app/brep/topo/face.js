import {TopoObject} from './topo-object'
import {Loop} from './loop'

export class Face extends TopoObject {

  constructor(surface) {
    super();
    this.id = undefined;
    this.surface = surface;
    this.shell = null;
    this.outerLoop = new Loop(this);
    this.innerLoops = [];
    this.defineIterable('loops', () => loopsGenerator(this));
    this.defineIterable('edges', () => halfEdgesGenerator(this))
  }
}

export function* loopsGenerator(face) {
  if (face.outerLoop !== null) {
    yield face.outerLoop;
  }
  for (let innerLoop of face.innerLoops) {
    yield innerLoop;
  }
}

export function* halfEdgesGenerator(face) {
  for (let loop of face.loops) {
    for (let halfEdge of loop.halfEdges) {
      yield halfEdge;
    }
  }
}
