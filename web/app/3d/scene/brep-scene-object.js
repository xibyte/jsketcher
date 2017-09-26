import Vector from '../../math/vector'
import {EDGE_AUX, FACE_CHUNK} from '../../brep/stitching'
import {normalOfCCWSeq} from '../cad-utils'
import {TriangulateFace} from '../tess/triangulation'
import {SceneSolid, SceneFace, WIREFRAME_MATERIAL, createSolidMaterial} from './scene-object'
import brepTess, {isMirrored} from '../tess/brep-tess'

const SMOOTH_RENDERING = false //true;

export class BREPSceneSolid extends SceneSolid {

  constructor(shell, type, skin) {
    super(type, undefined, skin);
    this.shell = shell;
    this.createGeometry();
  }

  createGeometry() {
    this.mesh = new THREE.Object3D();
    this.cadGroup.add(this.mesh);
    this.createFaces();
    this.createEdges();
    this.createVertices();
  }

  createFaces() {

    for (let brepFace of this.shell.faces) {
      const sceneFace = new BREPSceneFace(brepFace, this);
      this.sceneFaces.push(sceneFace);
      const geom = new THREE.Geometry();
      geom.dynamic = true;
      geom.faceVertexUvs[0] = [];

      function tess(nurbs) {
        // __DEBUG__.AddNormal(nurbs.point(0.5,0.5), nurbs.normalInMiddle());
        const tess = nurbs.verb.tessellate({maxDepth: 3});
        const trs = tess.faces.map(faceIndices => {
          return faceIndices.map(i => tess.points[i]).map(p => new Vector().set3(p));
        });
        trs.forEach(tr => tr.reverse());
        if (isMirrored(nurbs)) {

        }
        return trs;
      }


      const polygons = tess(brepFace.surface);
      const stitchedSurface = brepFace.data[FACE_CHUNK];
      const nurbs = stitchedSurface ? stitchedSurface.origin : undefined;

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
          let points = [firstVertex, poly[i - 1], poly[i]];

          let normalOrNormals;
          if (nurbs && SMOOTH_RENDERING) {
            function normal(v) {
              const uv = nurbs.closestParam(v.data());
              const vec = new THREE.Vector3();
              vec.set.apply(vec, nurbs.normal(uv[0], uv[1]));
              vec.normalize();
              return vec;
            }

            normalOrNormals = points.map(v => normal(v));
          } else {
            normalOrNormals = threeV(brepFace.surface.normal(firstVertex));
          }
          const face = new THREE.Face3(a, b, c);

          geom.faceVertexUvs[0].push( points.map(p => new THREE.Vector2().fromArray(brepFace.surface.verb.closestParam(p.data()))));
          // face.materialIndex = gIdx++;
          geom.faces.push(face);
        }
        geom.computeFaceNormals();
        let texture = createTexture(brepFace);
        let material = createSolidMaterial(Object.assign({}, this.skin, {
          map: texture,
          transparent: true,
          color: '0xffffff'

        }));
        this.mesh.add(new THREE.Mesh(geom, material))
        //view.setFaceColor(sceneFace, utils.isSmoothPiece(group.shared) ? 0xFF0000 : null);
      }

    }


    //geom.mergeVertices();
  }

  createEdges() {
    const visited = new Set();
    for (let edge of this.shell.edges) {
      if (edge.data[EDGE_AUX] === undefined) {
        const line = new THREE.Line(undefined, WIREFRAME_MATERIAL);
        const contour = edge.curve.verb.tessellate();
        for (let p of contour) {
          line.geometry.vertices.push(new THREE.Vector3().fromArray(p));
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
    return this.brepFace.surface.normal;
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

function createTexture(brepFace) {
  const w = 200;
  const h = 200;
  function getCanvas() {
    if (brepFace.data.__canvas === undefined) {
      let canvas = brepFace.data.__canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 200;
    }
    return brepFace.data.__canvas;
  }
  let canvas = getCanvas();
  let ctx = canvas.getContext("2d");



  // ctx.fillStyle = '0xB0C4DE'
  // ctx.fillRect(0,0, 400,400)

  // ctx.fillStyle = 'transparent'
  // ctx.beginPath();
  // ctx.moveTo(25, 25);
  // ctx.lineTo(105, 25);
  // ctx.lineTo(25, 105);
  // ctx.fill();
  ctx.scale(w,h);
  ctx.fillStyle = 'red';
  ctx.beginPath();

  for (let loop of brepFace.loops) {
    for (let he of loop.halfEdges) {
      const uvs = he.edge.curve.verb.tessellate().map(p => brepFace.verb.closestParam(p));
      if (he.inverted) {
        uvs.reverse();
      }
      let uv = uvs[0];
      ctx.moveTo(uv[0], uv[1]);
      for (let i = 1; i < uv.length; ++i) {
        uv = uvs[i];
        ctx.lineTo(uv[0], uv[1]);
      }
    }
  }


  ctx.moveTo(55, 55);

  ctx.lineTo(75, 175);
  ctx.fill();

  let texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function triangulateToThree(faces, geom) {
  const result = [];
  let gIdx = 0;

  function addFace(face) {
    face.materialIndex = gIdx++;
    geom.faces.push(face);
  }

  for (let brepFace of faces) {
    const groupStart = geom.faces.length;
    const polygons = brepTess(brepFace);
    const stitchedSurface = brepFace.data[FACE_CHUNK];
    const nurbs = stitchedSurface ? stitchedSurface.origin : undefined;
    let normalOrNormals = threeV(brepFace.surface.normalInMiddle());
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

        if (nurbs && SMOOTH_RENDERING) {
          function normal(v) {
            const uv = nurbs.closestParam(v.data());
            const vec = new THREE.Vector3();
            vec.set.apply(vec, nurbs.normal(uv[0], uv[1]));
            vec.normalize();
            return vec;
          }

          normalOrNormals = [firstVertex, poly[i - 1], poly[i]].map(v => normal(v));
        }
        const face = new THREE.Face3(a, b, c, normalOrNormals);
        createTexture(brepFace);
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


