import Vector from 'math/vector';
import {EDGE_AUX, FACE_CHUNK} from '../../../brep/stitching'
import {normalOfCCWSeq, normalOfCCWSeqTHREE} from '../../cad-utils';
import {TriangulateFace} from '../../tess/triangulation'
import {SceneSolid, SceneFace, WIREFRAME_MATERIAL} from './sceneObject'
import brepTess from '../../tess/brep-tess'
import tessellateSurface from '../../../brep/geom/surfaces/surfaceTess';
import NurbsSurface from '../../../brep/geom/surfaces/nurbsSurface';
import {BrepSurface} from '../../../brep/geom/surfaces/brepSurface';
import {createBoundingSurfaceFrom2DPoints} from '../../../brep/brep-builder';
import {Plane} from '../../../brep/geom/impl/plane';

const SMOOTH_RENDERING = false;

export class UnmanagedSceneSolid extends SceneSolid {

  constructor(data, type, skin) {
    super(type, undefined, skin);
    this.createGeometry(data);
    this.externalData = {};
  }

  createGeometry(data) {
    const geometry = new THREE.Geometry();
    geometry.dynamic = true;
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.cadGroup.add(this.mesh);
    this.createFaces(data.faces);
    this.createEdges(data.faces);
    this.createVertices();
  }

  createFaces(faces) {
    const geom = this.mesh.geometry;
    for (let faceData of faces) {
      const sceneFace = new UnmanagedSceneFace(faceData, this);
      this.sceneFaces.push(sceneFace);
      let tessellation = faceData.tess;
      const vec = arr => new THREE.Vector3().fromArray(arr);
      for (let i = 0; i < tessellation.length; ++i) {
        let off = geom.vertices.length;
        let tr = tessellation[i], normales;
        if (Array.isArray(tr)) {
          if (SMOOTH_RENDERING && tr[1] && !tr[1].find(n => n[0] === null || n[1] === null || n[2] === null)) {
            normales = tr[1].map(vec);
          }
          tr = tr[0];
        }
        tr.forEach(p => geom.vertices.push(vec(p)));
        if (!normales) {
          if (faceData.surface.normal) {
            normales = vec(faceData.surface.normal);
            if (faceData.inverted) {
              normales.negate();
            }
          }
        } else {
          if (faceData.inverted) {
            if (Array.isArray(normales)) {
              tr.forEach(n => n.negate())
            } else {
              normales.negate();
            }
          }
        }
        let indices = [off, off + 1, off + 2];
        let trNormal = normalOfCCWSeqTHREE(indices.map(i => geom.vertices[i]));
        if (normales) {
          let testNormal = Array.isArray(normales) ? normalizedSumOfTHREE(normales) : normales;
          if (testNormal.dot(trNormal) < 0) {
            indices.reverse();
          }
        } else {
          normales = trNormal;
          if (faceData.inverted) {
            normales.negate();
            indices.reverse();
          }          
        }
        let [a, b, c] = indices;
        
        const face = sceneFace.createMeshFace(a, b, c, normales);
        geom.faces.push(face);
      }
    }
    geom.mergeVertices();
  }

  createEdges(faces) {
    for (let faceData of faces) {
      for (let loop of faceData.loops) {
        for (let edgeData of loop) {
          const line = new THREE.Line(new THREE.Geometry(), WIREFRAME_MATERIAL);
          if (edgeData.tess) {
            edgeData.tess.forEach(p => line.geometry.vertices.push(new THREE.Vector3().fromArray(p)));
          }
          this.wireframeGroup.add(line);
        }
      }
    }
  }

  createVertices() {
  }
}

function normalizedSumOfTHREE(vecs) {
  let out = new THREE.Vector3().copy();
  vecs.forEach(v => out.add(v));
  out.normalize();
  return out;
}

class UnmanagedSceneFace extends SceneFace {
  constructor(faceData, solid) {
    super(solid, faceData.id);
    let s = faceData.surface;
    if (s.TYPE === 'B-SPLINE') {
      this._surface = new BrepSurface(NurbsSurface.create(s.degU, s.degV, s.knotsU, s.knotsV, s.cp, s.weights), faceData.inverted);
    } else if (s.TYPE === 'PLANE') {
      //TODO create bounded nurbs from face vertices when they are available
      let fakeBounds = [
        new Vector(0,0,0), new Vector(0,100,0), new Vector(100,100,0), new Vector(100,0,0)
      ];
      let normal = new Vector().set3(s.normal);
      let plane = new Plane(normal, normal.dot(new Vector().set3(s.origin)));
      if (faceData.inverted) {
        plane = plane.invert();
      }
      this._surface = createBoundingSurfaceFrom2DPoints(fakeBounds, plane);
    } else {
      this._surface = null;
      // throw 'unsupported surface type ' + s.TYPE;
    }
    if (this._surface !== null ) {
      this.plane = this._surface.tangentPlaneInMiddle();
    }
    this.bounds = faceData.loops.map(l => l.map(e => new Vector().set3(e.inverted ? e.b : e.a)));
  }


  normal() {
    return this.plane.normal;
  }

  depth() {
    return this.plane.w;
  }

  surface() {
    return this._surface;
  }

  getBounds() {
    return this.bounds;
  }
}
