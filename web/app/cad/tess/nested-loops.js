import pip from "./pip";
import {isCCW} from "geom/euclidean";

export default function(loops) {
  loops = loops.map(loop => new NestedLoop(loop));
  function contains(loop, other) {
    const classifyPointInsideLoop = pip(loop);
    for (const point of other) {
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
    const res = this.pip(pt);
    if (res.inside) {
      return res;
    }

  }

}

