import Vector from '../../math/vector'
import {EDGE_AUX, FACE_CHUNK} from '../../brep/stitching'
import {normalOfCCWSeq} from '../cad-utils'
import {TriangulateFace} from '../tess/triangulation'
import {SceneSolid, SceneFace, WIREFRAME_MATERIAL} from './scene-object'
import brepTess from '../tess/brep-tess'

const SMOOTH_RENDERING = false //true;

export class BREPSceneSolid extends SceneSolid {

  constructor(shell, type, skin) {
    super(type, undefined, skin);
    this.shell = shell;
    this.createGeometry();
  }

  createGeometry() {
    const geometry = new THREE.Geometry();
    geometry.dynamic = true;
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.cadGroup.add(this.mesh);
    this.createFaces();
    this.createEdges();
    this.createVertices();
  }

  createFaces() {
    const geom = this.mesh.geometry;
    const groups = triangulateToThree(this.shell, geom);
    for (let g of groups) {
      const sceneFace = new BREPSceneFace(g.brepFace, this);
      this.sceneFaces.push(sceneFace);
      for (let i = g.groupStart; i < g.groupEnd; i++) {
        const face = geom.faces[i];
        sceneFace.registerMeshFace(face);
      }
    }
    //geom.mergeVertices();
  }

  createEdges() {
    const visited = new Set();
    for (let edge of this.shell.edges) {
      if (edge.data[EDGE_AUX] === undefined) {
        const line = new THREE.Line(undefined, WIREFRAME_MATERIAL);
        const contour = edge.curve.tessellate();
        for (let p of contour) {
          line.geometry.vertices.push(p.three());
        }
        this.wireframeGroup.add(line);
        line.__TCAD_EDGE = edge;
        edge.data['scene.edge'] = line;
      }

    }
  }

  createVertices() {
  }
}
  
class BREPSceneFace extends SceneFace {
  constructor(brepFace, solid) {
    super(solid, brepFace.id);
    brepFace.id = this.id;
    this.brepFace = brepFace;
    brepFace.data['scene.face'] = this;
  }


  normal() {
    return this.brepFace.surface.normalInMiddle();
  }

  depth() {
    return this.brepFace.surface.w;
  }

  surface() {
    return this.brepFace.surface;
  }

  getBounds() {
    const bounds = [];
    for (let loop of this.brepFace.loops) {
      bounds.push(loop.asPolygon().map(p => new Vector().setV(p)));
    }
    return bounds;
  }
}

export function triangulateToThree(shell, geom) {
  const result = [];
  let gIdx = 0;

  function addFace(face) {
    face.materialIndex = gIdx++;
    geom.faces.push(face);
  }

  for (let brepFace of shell.faces) {
    const groupStart = geom.faces.length;
    const polygons = brepTess(brepFace);
    const stitchedSurface = brepFace.data[FACE_CHUNK];
    const nurbs = stitchedSurface ? stitchedSurface.origin : undefined;
    const isPlane = brepFace.surface.data.degree === 1;
    let normalOrNormals;
    if (isPlane) {
      normalOrNormals = threeV(brepFace.surface.normalInMiddle());
    }
    for (let p = 0; p < polygons.length; ++p) {
      const off = geom.vertices.length;
      const poly = polygons[p];
      const vLength = poly.length;
      if (vLength < 3) continue;
      const firstVertex = poly[0];
      geom.vertices.push(firstVertex.three());
      geom.vertices.push(poly[1].three());
      for (let i = 2; i < vLength; i++) {
        geom.vertices.push(poly[i].three());
        const a = off;
        const b = i - 1 + off;
        const c = i + off;

        if (!isPlane) {
          normalOrNormals = [firstVertex, poly[i - 1], poly[i]].map(v => brepFace.surface.normal(v));
        }
        const face = new THREE.Face3(a, b, c, normalOrNormals);
        addFace(face);
      }
      //view.setFaceColor(sceneFace, utils.isSmoothPiece(group.shared) ? 0xFF0000 : null);
    }
    result.push(new FaceGroup(brepFace, groupStart, geom.faces.length));
  }
  return result;
}

export function nurbsToThreeGeom(nurbs, geom) {
  const off = geom.vertices.length;
  const tess = nurbs.tessellate({maxDepth: 3});
  tess.points.forEach(p => geom.vertices.push(new THREE.Vector3().fromArray(p)));
  for (let faceIndices of tess.faces) {
    const face = new THREE.Face3(faceIndices[0] + off, faceIndices[1] + off, faceIndices[2] + off);
    geom.faces.push(face);
  }
}

class FaceGroup {
  constructor(brepFace, groupStart, groupEnd) {
    this.brepFace = brepFace;
    this.groupStart = groupStart;
    this.groupEnd = groupEnd;
  }
}

function threeV(v) {
  return new THREE.Vector3(v.x, v.y, v.z)
}
