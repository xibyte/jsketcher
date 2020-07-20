import pip from "./pip";
import {isCCW} from "geom/euclidean";

export default function(loops) {
  const loops = loops.map(loop => new NestedLoop(loop));
  function contains(loop, other) {
    let classifyPointInsideLoop = pip(loop);
    for (let point of other) {
      if (!classifyPointInsideLoop(point).inside) {
        return false;
      }
    }
    return true;
  }
  for (let i = 0; i < loops.length; ++i) {
    const loop = loops[i];
    for (let j = 0; j < loops.length; ++j) {
      if (i === j) continue;
      const other = loops[j];
      if (contains(loop.loop, other.loop)) {
        loop.nesting.push(other);
        other.level ++;
      }
    }
  }
  return loops.filter(l => l.level === 0);
}

class NestedLoop {
  constructor(loop) {
    this.loop = loop;
    this.nesting = [];
    this.level = 0;
    this.isHole = !isCCW(this.loop)
  }

  commit() {
    this.pip = pip(this.loop, this.nesting.map(nl => nl.loop));
  }

  classify(pt) {

  }

  classifyImpl(pt) {
    let res = this.pip(pt);
    if (res.inside) {
      return res;
    }

  }

}

function createFaces() {
  const loop = nestedLoop.loop;
  const newFace = new Face(surface);
  Object.assign(newFace.data, originFace.data);
  newFace.outerLoop = loop;
  loop.face = newFace;
  out.push(newFace);

  for (let child of nestedLoop.nesting) {
    if (child.level == level + 2) {
      createFaces(child, surface, level + 2);
    } else if (child.level == level + 1) {
      if (!child.loop.isCCW(surface)) {
        child.loop.face = newFace;
        newFace.innerLoops.push(child.loop);
      } else {
        createFaces(child, surface, level + 1);
      }
    }
  }
}
const beforeLength = out.length;
const nestedLoops = getNestedLoops(originFace, loops);
for (let nestedLoop of nestedLoops) {
  if (nestedLoop.level == 0) {
    createFaces(nestedLoop, originSurface, 0);
  }
}
}
