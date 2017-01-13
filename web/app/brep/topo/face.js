import {TopoObject} from './topo-object'

export class Face extends TopoObject {

  constructor(surface) {
    super();
    this.surface = surface;
    this.shell = null;
    this.outerLoop = null;
    this.innerLoops = [];
    this.defineIterable('loops', () => loopsGenerator(this))
  }
}

export function* loopsGenerator(face) {
  if (face.outerLoop != null) {
    yield face.outerLoop;
  }
  for (let innerLoop of face.innerLoops) {
    yield innerLoop;
  }
}
  