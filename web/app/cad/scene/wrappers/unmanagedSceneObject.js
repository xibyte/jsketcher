import Vector from 'math/vector';
import {EDGE_AUX, FACE_CHUNK} from '../../../brep/stitching'
import {normalOfCCWSeq} from '../../cad-utils'
import {TriangulateFace} from '../../tess/triangulation'
import {SceneSolid, SceneFace, WIREFRAME_MATERIAL} from './sceneObject'
import brepTess from '../../tess/brep-tess'
import tessellateSurface from '../../../brep/geom/surfaces/surfaceTess';
import NurbsSurface from '../../../brep/geom/surfaces/nurbsSurface';

const SMOOTH_RENDERING = false;

export class UnmanagedSceneSolid extends SceneSolid {

  constructor(data, type, skin) {
    super(type, undefined, Object.assign({side : THREE.DoubleSide}, skin));
    this.createGeometry(data);
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
        if (!normales && faceData.surface.TYPE === 'PLANE') {
          normales = vec(faceData.surface.normal);
        }
        
        const face = sceneFace.createMeshFace(off, off + 1, off + 2, normales);
        geom.faces.push(face);
      }
    }
    if (!SMOOTH_RENDERING) {
      geom.computeFaceNormals();
    }
    //geom.mergeVertices();
  }

  createEdges(faces) {
    for (let faceData of faces) {
      for (let edgeData of faceData.edges) {
        const line = new THREE.Line(new THREE.Geometry(), WIREFRAME_MATERIAL);
        if (edgeData.tess) {
          edgeData.tess.forEach(p => line.geometry.vertices.push(new THREE.Vector3().fromArray(p)));
        }
        this.wireframeGroup.add(line);
      }
    }
  }

  createVertices() {
  }
}

class UnmanagedSceneFace extends SceneFace {
  constructor(faceData, solid) {
    super(solid, faceData.id);
    this.surface = faceData.surface;
    // if (this.surface.TYPE === 'B-SPLINE') {
    //   let s = this.surface; 
    //   let nurbs = new NurbsSurface(verb.geom.NurbsSurface.byKnotsControlPointsWeights(s.degU, s.degV, s.knotsU, s.knotsV, s.cp, s.weights));
    //   __DEBUG__.AddParametricSurface(nurbs);
    // }
  }


  normal() {
    return this.surface.normalInMiddle();
  }

  depth() {
    return this.surface.tangentPlaneInMiddle().w;
  }

  surface() {
    return this.surface;
  }

  getBounds() {
    return [
      this.surface.southEastPoint(),
      this.surface.southWestPoint(),
      this.surface.northWestPoint(),
      this.surface.northEastPoint()
    ];
  }
}
