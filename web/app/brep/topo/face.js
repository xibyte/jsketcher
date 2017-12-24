import {TopoObject} from './topo-object'
import {Loop} from './loop'
import PIP from '../../3d/tess/pip';
import {NurbsCurve} from "../geom/impl/nurbs";
import {eqSqTol, veq} from "../geom/tolerance";
import {isCurveEntersEdgeAtPoint, isCurveEntersEnclose} from "../operations/boolean";

export class Face extends TopoObject {

  constructor(surface) {
    super();
    this.surface = surface;
    this.shell = null;
    this.outerLoop = new Loop(this);
    this.innerLoops = [];
    this.defineIterable('loops', () => loopsGenerator(this));
    this.defineIterable('edges', () => halfEdgesGenerator(this));
    Object.defineProperty(this, "id", {
      get: () => this.data.id,
      set: (value) => this.data.id = value,
    });
  }

  createWorkingPolygon() {
    return [this.outerLoop, ...this.innerLoops].map(loop => loop.tess().map(pt => this.surface.workingPoint(pt)));
  }

  env2D() {
    if (this.__2d === undefined) {
      let workingPolygon = this.createWorkingPolygon();
      let [inner, ...outers] = workingPolygon;
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
  
  rayCast(pt) {
    function vertexResult(vertex) {
      return {
        inside: true,
        strictInside: false,
        vertex
      }
    }
    let initVertex = this.getAnyVertex();
    if (veq(pt, initVertex.point)) {
      return vertexResult(initVertex); 
    }
    let ray = NurbsCurve.createLinearNurbs(pt, initVertex.point);    

    for (let edge of this.edges) {
      if (veq(pt, edge.vertexA.point)) {
        return vertexResult(edge.vertexA);
      }
    }

    for (let edge of this.edges) {
      if (edge.edge.curve.passesThrough(pt)) {
        return {
          inside: true,
          strictInside: false,
          edge
        }
      }
    }
    let result = null;

    for (let loop of this.loops) {
      for (let [a, b, v] of loop.encloses) {
        if (ray.passesThrough(v.point) || initVertex === v) {
          let dist = pt.distanceToSquared(v.point);
          if (result === null || dist < result.dist) {
            let inside = !isCurveEntersEnclose(ray, a, b, true);
            result = {
              dist,
              inside,
              strictInside: inside,
            };
          }
        }
      }
    }

    for (let edge of this.edges) {
      let intersectionPoints = ray.intersectCurve(edge.edge.curve);
      for (let {p0: ip} of intersectionPoints) {
        let dist = pt.distanceToSquared(ip);
        if (result === null || (!eqSqTol(dist, result.dist) && dist < result.dist)) {
          let inside = !isCurveEntersEdgeAtPoint(ray, edge, ip);
          result = {
            dist,
            inside,
            strictInside: inside,
          }
        }
      }
    }  
    return result;    
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
