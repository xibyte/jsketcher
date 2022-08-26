import {BufferAttribute, BufferGeometry, DoubleSide} from "three";

import brepTess from '../../tess/brep-tess';
import tessellateSurface from 'geom/surfaces/surfaceTess';
import * as vec from 'math/vec';


export function createSolidMaterial(skin) {
  return new THREE.MeshPhongMaterial(Object.assign({
    // vertexColors: THREE.FaceColors,
    color: 0xaeaeae,
    shininess: 0,
    polygonOffset : true,
    polygonOffsetFactor : 1,
    polygonOffsetUnits : 2,
    side: DoubleSide,
  }, skin));
}

const SMOOTH_RENDERING = true;

export function tessDataToGeom(tessellation) {
  const vertices = [];
  const normals3 = [];
  for (const [tr, normales] of tessellation) {
    tr.forEach(p => vertices.push(...p));

    if (normales && SMOOTH_RENDERING) {
      normales.forEach(n => normals3.push(...n));
    } else {
      const n = vec.normal3(tr);
      normals3.push(...n, ...n, ...n);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute( new Float32Array(vertices), 3));
  geometry.setAttribute('normal', new BufferAttribute( new Float32Array(normals3), 3));
  return geometry;
}

export function brepFaceToGeom(brepFace) {
  const polygons = brepTess(brepFace);
  return surfaceAndPolygonsToGeom(brepFace.surface, polygons);
}

export function surfaceAndPolygonsToGeom(surface, polygons) {

  const vertices = [];
  const normals = [];
  const index = [];

  const isPlane = surface.simpleSurface && surface.simpleSurface.isPlane;
  const planeNormal = isPlane ? surface.normalInMiddle().data() : null;
  function pushVertex(vtx) {
    vertices.push(vtx.x, vtx.y, vtx.z);
    if (!isPlane) {
      const normal = surface.normal(vtx);
      normals.push(normal.x, normal.y, normal.z);
    } else {
      normals.push(...planeNormal);
    }

  }
  for (let p = 0; p < polygons.length; ++p) {
    const off = vertices.length / 3;
    const poly = polygons[p];
    const vLength = poly.length;
    if (vLength < 3) continue;

    const firstVertex = poly[0];

    pushVertex(firstVertex)

    for (let i = 2; i < vLength; i++) {

      const pVert = poly[i - 1];
      const iVert = poly[i];
      pushVertex(pVert);
      pushVertex(iVert);
      const a = off;
      const b = (i - 1) + off;
      const c = i + off;
      index.push(a, b, c);
    }
    //view.setFaceColor(sceneFace, utils.isSmoothPiece(group.shared) ? 0xFF0000 : null);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute( new Float32Array(vertices), 3));
  geometry.setAttribute('normal', new BufferAttribute( new Float32Array(normals), 3));
  geometry.setIndex( index );
  return geometry;

}

export function surfaceToThreeGeom(srf, geom) {
  const off = geom.vertices.length;
  const tess = tessellateSurface(srf);
  tess.points.forEach(p => geom.vertices.push(new THREE.Vector3().fromArray(p)));
  for (const faceIndices of tess.faces) {
    const face = new THREE.Face3(faceIndices[0] + off, faceIndices[1] + off, faceIndices[2] + off);
    geom.faces.push(face);
  }
}