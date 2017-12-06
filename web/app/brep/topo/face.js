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
  
  clone() {
    function cloneLoop(source, dest) {
      source.halfEdges.forEach(edge => dest.halfEdges.push(edge.clone()));
      Object.assign(dest.data, source.data);
      return dest;
    }
    
    let clone = new Face(this.surface);
    cloneLoop(this.outerLoop, clone.outerLoop);
    this.innerLoops.forEach(loop => clone.innerLoops.push(cloneLoop(loop, new Loop(clone))));
    Object.assign(clone.data, this.data);
    return clone;
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
