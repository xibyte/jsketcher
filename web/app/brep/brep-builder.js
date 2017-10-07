import {NurbsSurface, NurbsCurve} from './geom/impl/nurbs';
import {Plane} from './geom/impl/plane';
import {Point} from './geom/point';
import {Shell} from './topo/shell';
import {Face} from './topo/face';
import {Loop} from './topo/loop';
import {Edge} from './topo/edge';
import {Vertex} from './topo/vertex';
import {normalOfCCWSeq} from '../3d/cad-utils';
import BBox from "../math/bbox";

export default class BrepBuilder {

  constructor() {
    this._shell = new Shell();    
    this._face = null;
    this._loop = null;
  }

  face(surface) {
    this._face = new Face(surface ? surface : null);
    this._shell.faces.push(this._face);
    this._loop = null;
    return this;  
  }

  loop(vertices) {
    if (this._loop === null) {
      this._loop = this._face.outerLoop;
    } else {
      this._loop = new Loop();
      this._face.innerLoops.push(this._loop);
    }
    if (vertices) {
      for (let i = 0; i < vertices.length; ++i) {
        this.edge(vertices[i], vertices[(i + 1) % vertices.length]);  
      }
    }
    return this;
  }

  edgeTrim(a, b, curve) {
    let u1 = curve.closestParam(a.point.data());
    curve = curve.split(u1)[1];
    let u2 = curve.closestParam(b.point.data());
    curve = curve.split(u2)[0];
    this.edge(a, b, new NurbsCurve(curve));
    return this;
  }

  edge(a, b, curve) {
    let he = a.edgeFor(b);
    if (he === null) {
      if (!curve) {
        curve = NurbsCurve.createLinearNurbs(a.point, b.point);
      }
      const e = new Edge(curve, a, b);
      he = e.halfEdge1;
    }
    this._loop.halfEdges.push(he);
    return this;   
  }

  vertex(x, y, z) {
    return new Vertex(new Point(x, y, z));
  }

  build() {
    for (let face of this._shell.faces) {
      for (let loop of face.loops) {
        loop.link();    
      }  
      if (face.surface === null) {
        face.surface = createBoundingNurbs(face.outerLoop.tess());
      }
    }
    for (let face of this._shell.faces) {
      for (let he of face.edges) {
        let twin = he.twin();
        if (twin.loop === null) {
          const nullFace = new Face(face.surface);          
          nullFace.outerLoop.halfEdges.push(twin);
          nullFace.outerLoop.link();
        }
      }
    }
    return this._shell;
  }
}

export function createBoundingNurbs(points, plane) {
  if (!plane) {
    const normal = normalOfCCWSeq(points);
    const w = points[0].dot(normal);
    plane = new Plane(normal, w);
  }
  let to2D = plane.get2DTransformation();

  let points2d = points.map(p => to2D.apply(p));
  let bBox = new BBox();
  points2d.forEach(p => bBox.checkPoint(p));

  let to3D = plane.get3DTransformation();
  let polygon = bBox.toPolygon();
  polygon = polygon.map(p => to3D._apply(p).data());

  let planeNurbs = verb.geom.NurbsSurface.byKnotsControlPointsWeights( 1, 1, [0,0,1,1], [0,0,1,1],
    [ [ polygon[3], polygon[2]] ,
      [ polygon[0], polygon[1] ] ] );

  const nurbs = new NurbsSurface(planeNurbs);

  __DEBUG__.AddNurbs(nurbs);
  __DEBUG__.AddSurfaceNormal(nurbs);

  return nurbs;
}
