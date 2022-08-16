import {Face} from '../topo/face';
import {Vertex} from '../topo/vertex';
import Vector from 'math/vector';
import PIP from '../../../web/app/cad/tess/pip';
import {isCCW} from "geom/euclidean";

export function evolveFace(originFace, loops) {
  const out = [];
  const originSurface = originFace.surface;
  let invertedSurface = null;
  function invertSurface() {
    if (invertedSurface == null) {
      invertedSurface = originSurface.invert();
    }
    return invertedSurface;
  }

  function createFaces(nestedLoop, level) {
    let surface;
    // __DEBUG__.AddPointPolygon(nestedLoop.workingPolygon)
    if (nestedLoop.inverted) {
      surface = invertSurface(surface);   
    } else {
      surface = originSurface;
    }

    const loop = nestedLoop.loop;
    const newFace = new Face(surface);
    Object.assign(newFace.data, originFace.data);
    newFace.data.__origin = originFace;
    newFace.outerLoop = loop;
    loop.face = newFace;
    out.push(newFace);

    for (const child of nestedLoop.nesting) {
      if (child.level == level + 2) {
        createFaces(child, level + 2);
      } else if (child.level == level + 1) {      
        if (nestedLoop.inverted !== child.inverted) {
          child.loop.face = newFace;
          newFace.innerLoops.push(child.loop);
        } else {
          createFaces(child, level + 1);
        }
      }
    }
  }
  const nestedLoops = getNestedLoops(originFace, loops);
  for (const nestedLoop of nestedLoops) {
    if (nestedLoop.level == 0) {
      createFaces(nestedLoop, 0);
    }
  }
  if (out.length !== 0) {
    out[0].id = originFace.id;
  }
  return out;
}

function getNestedLoops(face, brepLoops) {
  function NestedLoop(loop) {
    this.loop = loop;
    this.workingPolygon = loop.tess().map(p => face.surface.workingPoint(p));
    this.inverted = !isCCW(this.workingPolygon);
    this.pip = PIP(this.workingPolygon);
    this.nesting = [];
    this.level = 0;
  }

  const loops = brepLoops.map(loop => new NestedLoop(loop));
  function contains(loop, other) {
    for (const point of other.workingPolygon) {
      if (!loop.pip(point).inside) {
        return false;
      }
    }
    return true;
  }
  for (let i = 0; i < loops.length; ++i) {
    const loop = loops[i];
    for (let j = 0; j < loops.length; ++j) {
      if (i == j) continue;
      const other = loops[j];
      if (contains(loop, other)) {
        loop.nesting.push(other);
        other.level ++;
      }
    }
  }
  return loops.filter(l => l.level == 0);
}
