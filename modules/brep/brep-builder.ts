import {Plane} from 'geom/impl/plane';
import {Point} from 'geom/point';
import {Shell} from './topo/shell';
import {Face} from './topo/face';
import {Loop} from './topo/loop';
import {Vertex} from './topo/vertex';
import {normalOfCCWSeq} from '../../web/app/cad/cad-utils';
import BBox from 'math/bbox';
import NurbsSurface from 'geom/surfaces/nurbsSurface';
import {BrepSurface} from 'geom/surfaces/brepSurface';
import EdgeIndex from './edgeIndex';
import {HalfEdge} from "brep/topo/edge";
import Vector from "math/vector";

export default class BrepBuilder {
  _shell: Shell;
  _face: Face;
  _loop: Loop;
  edgeIndex: EdgeIndex;

  constructor() {
    this._shell = new Shell();    
    this._face = null;
    this._loop = null;
    this.edgeIndex = new EdgeIndex();
  }
  
  get lastHalfEdge(): HalfEdge {
    return this._loop.halfEdges[this._loop.halfEdges.length - 1];
  }

  face(surface?: BrepSurface): BrepBuilder {
    this._face = new Face(surface ? surface : null);
    this._shell.faces.push(this._face);
    this._loop = null;
    return this;  
  }

  loop(vertices?: Vertex[]): BrepBuilder {
    if (this._loop === null) {
      this._loop = this._face.outerLoop;
    } else {
      this._loop = new Loop(null);
      this._face.innerLoops.push(this._loop);
    }
    this._loop.face = this._face;  
    if (vertices) {
      for (let i = 0; i < vertices.length; ++i) {
        this.edge(vertices[i], vertices[(i + 1) % vertices.length]);  
      }
    }
    return this;
  }

  edgeTrim(a, b, curve) {
    const curveCreate = () => {
      const u1 = curve.param(a.point);
      curve = curve.splitByParam(u1)[1];
      const u2 = curve.param(b.point);
      curve = curve.splitByParam(u2)[0];
    };
    this.edge(a, b, curveCreate);
    return this;
  }

  edge(a, b, curveCreate?, invertedToCurve?, tag?): BrepBuilder {
    const he = this.edgeIndex.getHalfEdgeOrCreate(a, b, curveCreate, invertedToCurve, tag);
    this._loop.halfEdges.push(he);
    return this;   
  }

  vertex(x: number, y: number, z: number): Vertex {
    return new Vertex(new Point(x, y, z));
  }

  build(): Shell {
    for (const face of this._shell.faces) {
      face.shell = this._shell;
      for (const loop of face.loops) {
        loop.link();    
      }  
      if (face.surface === null) {
        face.surface = createBoundingSurface(face.outerLoop.tess());
      }
    }
    for (const face of this._shell.faces) {
      for (const he of face.edges) {
        const twin = he.twin();
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

export function createBoundingSurface(points: Vector[], plane?: Plane): BrepSurface {
  if (!plane) {
    const normal = normalOfCCWSeq(points);
    const w = points[0].dot(normal);
    plane = new Plane(normal, w);
  }
  const to2D = plane.get2DTransformation();
  const points2d = points.map(p => to2D.apply(p));

  return createBoundingSurfaceFrom2DPoints(points2d, plane);
}

export function createBoundingSurfaceFrom2DPoints(points2d: Vector[], plane: Plane, minWidth?: number, minHeight?: number, offset = 0): BrepSurface {
  const bBox = new BBox();
  points2d.forEach(p => bBox.checkPoint(p));

  if (minWidth && bBox.width() < minWidth) {
    bBox.checkBounds(  minWidth * 0.5, 0);
    bBox.checkBounds(- minWidth * 0.5, 0);
  }
  if (minHeight && bBox.height() < minHeight) {
    bBox.checkBounds(0,   minHeight * 0.5);
    bBox.checkBounds(0, - minHeight * 0.5);
  }

  if (offset !== 0) {
    bBox.maxX += offset * 0.5;
    bBox.minX -= offset * 0.5;
    bBox.maxY += offset * 0.5;
    bBox.minY -= offset * 0.5;
  }
  
  return createBoundingSurfaceFromBBox(bBox, plane);
} 

export function createBoundingSurfaceFromBBox(bBox: BBox, plane: Plane): BrepSurface {
  const to3D = plane.get3DTransformation();
  let polygon = bBox.toPolygon() as Vector[];
  polygon = polygon.map(p => to3D._apply(p).data());

  const planeNurbs = verb.geom.NurbsSurface.byKnotsControlPointsWeights( 1, 1, [0,0,1,1], [0,0,1,1],
    [ [ polygon[3], polygon[2]] ,
      [ polygon[0], polygon[1] ] ] );

  const nurbs = new NurbsSurface(planeNurbs);

  // __DEBUG__.AddNurbs(nurbs);
  // __DEBUG__.AddSurfaceNormal(nurbs);

  return new BrepSurface(nurbs);
  
}