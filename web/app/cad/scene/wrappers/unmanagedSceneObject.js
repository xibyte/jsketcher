import Vector from 'math/vector';
import {normalOfCCWSeqTHREE} from '../../cad-utils';
import {SceneEdge, SceneFace, SceneSolid} from './sceneObject';
import NurbsSurface from '../../../brep/geom/surfaces/nurbsSurface';
import {BrepSurface} from '../../../brep/geom/surfaces/brepSurface';
import {createBoundingSurfaceFrom2DPoints} from '../../../brep/brep-builder';
import {Plane} from '../../../brep/geom/impl/plane';
import {setAttribute} from 'scene/objectData';
import {perpendicularVector} from '../../../math/math';
import * as vec from '../../../math/vec';


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
    this.createVertices();
  }

  createFaces(faces) {
    const geom = this.mesh.geometry;
    for (let faceData of faces) {
      const sceneFace = new UnmanagedSceneFace(faceData, this);
      this.sceneFaces.push(sceneFace);
      let tessellation = faceData.tess;
      for (let i = 0; i < tessellation.length; ++i) {
        let off = geom.vertices.length;
        let tr = tessellation[i], normales;
        if (Array.isArray(tr)) {
          if (SMOOTH_RENDERING && tr[1] && !tr[1].find(n => n[0] === null || n[1] === null || n[2] === null)) {
            normales = tr[1].map(vThree);
          }
          tr = tr[0];
        }
        tr.forEach(p => geom.vertices.push(vThree(p)));
        if (!normales) {
          if (faceData.surface.normal) {
            normales = vThree(faceData.surface.normal);
            if (faceData.inverted) {
              normales.negate();
            }
          }
        } else {
          if (faceData.inverted) {
            if (Array.isArray(normales)) {
              normales.forEach(n => n.negate())
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
        this.createEdge(sceneFace, faceData);
      }
    }
    geom.mergeVertices();
  }

  createEdge(sceneFace, faceData) {
    for (let loop of faceData.loops) {
      const geometry = new THREE.Geometry();
      geometry.dynamic = true;
      let mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
        vertexColors: THREE.FaceColors,
        color: 0x2B3856,
        shininess: 0,
      }));
      const width = 1;
      for (let edgeData of loop) {
        let sceneEdge = new SceneEdge(edgeData.ptr, null);
        sceneFace.edges.push(sceneEdge);
        sceneEdge.data.ptr = edgeData.ptr;
    
        if (edgeData.tess) {
          let base = null;
          for (let i = 1; i < edgeData.tess.length; i++) {
            
            let a  = edgeData.tess[i - 1];
            let b  = edgeData.tess[i];
            let ab = vec._normalize(vec.sub(b, a));
            
            let dirs = [];
            dirs[0] = perpendicularVector(ab);
            dirs[1] = vec.cross(ab, dirs[0]);
            dirs[2] = vec.negate(dirs[0]);
            dirs[3] = vec.negate(dirs[1]);

            dirs.forEach(d => vec._mul(d, width));
            if (base === null) {
              base = dirs.map(d => vec.add(a, d));
            }
            let lid = dirs.map(d => vec.add(b, d));

            let off = geometry.vertices.length;
            base.forEach(p => geometry.vertices.push(vThree(p)))
            lid.forEach(p => geometry.vertices.push(vThree(p)))
            base = lid;
            
            let faces = [
              [0, 4, 3],
              [3, 4, 7],
              [2, 3, 7],
              [7, 6, 2],
              [0, 1, 5],
              [5, 4, 0],
              [1, 2, 6],
              [6, 5, 1],
            ].forEach(([a, b, c]) => geometry.faces.push(new THREE.Face3(a + off, b + off, c + off)));
          }

          setAttribute(mesh, 'edge', sceneEdge);
        }
      }
      geometry.computeFaceNormals();
      this.wireframeGroup.add(mesh);
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

const vThree = arr => new THREE.Vector3().fromArray(arr);
