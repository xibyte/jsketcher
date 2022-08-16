import {TopoObject} from './topo-object'
import {Loop} from './loop'
import PIP from '../../../web/app/cad/tess/pip';
import {veq} from "geom/tolerance";
import {isOnPositiveHalfPlaneFromVec} from "../operations/boolean";
import {BrepSurface} from "geom/surfaces/brepSurface";
import {Shell} from "./shell";
import {HalfEdge} from "brep/topo/edge";

export class Face extends TopoObject {


  surface: BrepSurface;
  shell: Shell;
  outerLoop: Loop;
  innerLoops: Loop[];
  private __2d: any;

  loops = {
    [Symbol.iterator]: () => loopsGenerator(this)
  };
  edges = {
    [Symbol.iterator]: () => halfEdgesGenerator(this)
  };


  constructor(surface: BrepSurface) {
    super();
    this.surface = surface;
    this.shell = null;
    this.outerLoop = new Loop(this);
    this.innerLoops = [];
  }

  get id(): string {
    return this.data.id;
  }

  set id(value: string) {
    this.data.id = value
  }

  createWorkingPolygon() {
    return [this.outerLoop, ...this.innerLoops].map(loop => loop.tess().map(pt => this.surface.workingPoint(pt)));
  }

  env2D() {
    if (this.__2d === undefined) {
      const workingPolygon = this.createWorkingPolygon();
      const [inner, ...outers] = workingPolygon;
      this.__2d = {
        pip: PIP(inner, outers),
        workingPolygon
      }
    }
    return this.__2d;
  }
  
  getAnyHalfEdge() {
    let e = this.outerLoop.halfEdges[0];
    if (!e && this.innerLoops[0]) {
      e = this.innerLoops[0].halfEdges[0];
    }
    return e;
  }
  
  getAnyVertex() {
    return this.getAnyHalfEdge().vertexA;
  }
  
  rayCast(pt, surface) {

    surface = surface || this.surface;
    
    for (const edge of this.edges) {
      if (veq(pt, edge.vertexA.point)) {
        return {
          inside: true,
          strictInside: false,
          vertex: edge.vertexA
        };
      }
    }

    for (const edge of this.edges) {
      if (edge.edge.curve.passesThrough(pt)) {
        return {
          inside: true,
          strictInside: false,
          edge
        }
      }
    }

    function closestPointToEdge(edge) {
      return edge.edge.curve.point(edge.edge.curve.param(pt));
    }
    
    let closest = null;    
    for (const edge of this.edges) {
      const closestPoint = closestPointToEdge(edge);
      const dist = pt.distanceToSquared(closestPoint);
      if (closest === null || dist < closest.dist) {
        closest = {dist, pt: closestPoint, edge};
      }
    }
    let enclose = null;
    function findEnclosure(vertex) {
      for (const e of closest.edge.loop.encloses) {
        if (e[2] === vertex) {
          return e;
        }
      }
    }
    if (veq(closest.pt, closest.edge.vertexA.point)) {
      enclose = [closest.edge.prev, closest.edge, closest.edge.vertexA];
    } else if (veq(closest.pt, closest.edge.vertexB.point)) {
      enclose = [closest.edge, closest.edge.next, closest.edge.vertexB];
    }

    const normal = surface.normal(closest.pt);
    const testee = (enclose ? enclose[2].point : closest.pt).minus(pt)._normalize();
    
    // __DEBUG__.AddSegment(pt, enclose ? enclose[2].point : closest.pt);
    
    let tangent;
    if (enclose !== null) {
      const [ea, eb] = enclose;
      tangent = ea.tangentAtEnd().plus(eb.tangentAtStart())._normalize();
    } else {
      tangent = closest.edge.tangent(closest.pt);
    }
    // __DEBUG__.AddNormal(closest.pt, tangent);

    const inside = !isOnPositiveHalfPlaneFromVec(tangent, testee, normal);
    return {
      inside,
      strictInside: inside,
    };
  }
}

export function* loopsGenerator(face): Generator<Loop> {
  if (face.outerLoop !== null) {
    yield face.outerLoop;
  }
  for (const innerLoop of face.innerLoops) {
    yield innerLoop;
  }
}

export function* halfEdgesGenerator(face): Generator<HalfEdge> {
  for (const loop of face.loops) {
    for (const halfEdge of loop.halfEdges) {
      yield halfEdge;
    }
  }
}
