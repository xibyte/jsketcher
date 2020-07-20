import Vector from 'math/vector';
import {SceneEdge, SceneFace, SceneSolid} from './sceneObject';
import brepTess from '../../tess/brep-tess';
import tessellateSurface from 'geom/surfaces/surfaceTess';
import {setAttribute} from 'scene/objectData';
import * as vec from 'math/vec';
import {perpendicularVector} from "geom/euclidean";

const SMOOTH_RENDERING = true;

export class BREPSceneSolid extends SceneSolid {

  constructor(shell, type, skin) {
    super(type, undefined, skin);
    this.shell = shell;
    this.externals = this.shell.data.externals;
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
    for (let brepFace of this.shell.faces) {
      const sceneFace = new BREPSceneFace(brepFace, this);
      this.sceneFaces.push(sceneFace);
      let off = geom.faces.length;
      if (brepFace.data.tessellation) {
        tessDataToGeom(brepFace.data.tessellation.data, geom)
      } else {
        brepFaceToGeom(brepFace, geom);
      }
      for (let i = off; i < geom.faces.length; i++) {
        sceneFace.registerMeshFace(geom.faces[i]);
      }
    }
    geom.mergeVertices();
  }

  createEdges() {
    for (let edge of this.shell.edges) {
      this.createEdge(edge);
    }
  }

  createEdge(edge) {
    const doEdge = (edge, aux, width, color, opacity) => {
      const geometry = new THREE.Geometry();
      const scaleTargets = [];
      geometry.dynamic = true;
      let materialParams = {
        color,
        vertexColors: THREE.FaceColors,
        shininess: 0,
        visible: !aux,
        morphTargets: true
      };
      if (opacity !== undefined) {
        materialParams.transparent = true;
        materialParams.opacity = opacity;
      }
      let tess = edge.data.tessellation ? edge.data.tessellation : edge.curve.tessellateToData();
      let base = null;
      for (let i = 1; i < tess.length; i++) {

        let a  = tess[i - 1];
        let b  = tess[i];
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
        base.forEach(p => geometry.vertices.push(vThree(p)));
        lid.forEach(p => geometry.vertices.push(vThree(p)));

        function addScaleTargets(points, origin) {
          points.forEach(p => scaleTargets.push(vThree(vec._add(vec._mul(vec.sub(p, origin), 10), origin))));
        }
        addScaleTargets(base, a);
        addScaleTargets(lid, b);


        base = lid;

        [
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
      geometry.morphTargets.push( { name: "scaleTargets", vertices: scaleTargets } );
      geometry.computeFaceNormals();

      let mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial(materialParams));
      this.wireframeGroup.add(mesh);

      // mesh.morphTargetInfluences[ 0 ] = 0.2;
      return mesh;
    };
    let sceneEdge = new SceneEdge(null, this);
    sceneEdge.externals = edge.data.externals;
    this.sceneEdges.push(sceneEdge);
    let representation = doEdge(edge, false,  1, 0x2B3856);
    let marker = doEdge(edge, true, 3, 0xFA8072, 0.8);

    setAttribute(representation, 'edge', sceneEdge);
    setAttribute(marker, 'edge', sceneEdge);

    sceneEdge.representation = representation;
    sceneEdge.marker = marker;
  }

  createVertices() {
  }
}
  
class BREPSceneFace extends SceneFace {
  constructor(brepFace, solid) {
    super(solid, brepFace.id);
    brepFace.id = this.id;
    this.brepFace = brepFace;
    this.externals = this.brepFace.data.externals;
  }

  normal() {
    return this.brepFace.surface.normalInMiddle();
  }

  depth() {
    return this.brepFace.surface.tangentPlaneInMiddle().w;
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


export function tessDataToGeom(tessellation, geom) {
  for (let [tr, normales] of tessellation) {
    let off = geom.vertices.length;
    tr.forEach(p => geom.vertices.push(vThree(p)));

    if (normales && SMOOTH_RENDERING) {
      normales = normales.map(vThree)
    } else {
      normales = vThree(vec.normal3(tr));
    }
    const face = new THREE.Face3(off, off + 1, off + 2, normales);
    geom.faces.push(face);
  }
}

export function brepFaceToGeom(brepFace, geom) {
  const polygons = brepTess(brepFace);
  return surfaceAndPolygonsToGeom(brepFace.surface, polygons, geom);
}

export function surfaceAndPolygonsToGeom(surface, polygons, geom) {
  
  const isPlane = surface.simpleSurface && surface.simpleSurface.isPlane;
  let normalOrNormals;
  if (isPlane) {
    normalOrNormals = surface.normalInMiddle().three();
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
        normalOrNormals = [firstVertex, poly[i - 1], poly[i]].map(v => surface.normal(v));
      }
      const face = new THREE.Face3(a, b, c, normalOrNormals);
      geom.faces.push(face);
    }
    //view.setFaceColor(sceneFace, utils.isSmoothPiece(group.shared) ? 0xFF0000 : null);
  }
}

export function surfaceToThreeGeom(srf, geom) {
  const off = geom.vertices.length;
  const tess = tessellateSurface(srf);
  tess.points.forEach(p => geom.vertices.push(new THREE.Vector3().fromArray(p)));
  for (let faceIndices of tess.faces) {
    const face = new THREE.Face3(faceIndices[0] + off, faceIndices[1] + off, faceIndices[2] + off);
    geom.faces.push(face);
  }
}


const vThree = arr => new THREE.Vector3().fromArray(arr);
