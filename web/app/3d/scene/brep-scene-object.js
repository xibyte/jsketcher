import Vector from '../../math/vector'
import {EDGE_AUX} from '../../brep/stitching'
import {normalOfCCWSeq} from '../cad-utils'
import {Triangulate} from '../../3d/triangulation'
import {SceneSolid, SceneFace, WIREFRAME_MATERIAL} from './scene-object'

const SMOOTH_RENDERING = true;

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
      for (let i = g.groupStart; i < g.groupEnd; i ++) {
        const face = geom.faces[i];
        sceneFace.registerMeshFace(face);
      }
    }
    //geom.mergeVertices();
  }

  createEdges() {
    const visited = new Set();
    for (let face of this.shell.faces) {
      for (let halfEdge of face.outerLoop.halfEdges) {
        if (!visited.has(halfEdge.edge)) {
          visited.add(halfEdge.edge);
          if (halfEdge.edge.data[EDGE_AUX] === undefined) {
            const line = new THREE.Line(undefined, WIREFRAME_MATERIAL);
            const contour = [halfEdge.vertexA.point];
            halfEdge.edge.curve.approximate(10, halfEdge.vertexA.point, halfEdge.vertexB.point, contour);
            contour.push(halfEdge.vertexB.point);
            for (let p of contour) {
              line.geometry.vertices.push(p.three());
            }
            this.wireframeGroup.add(line);
            line.__TCAD_EDGE = halfEdge.edge;
            halfEdge.edge.data['scene.edge'] = line;
          }
        }
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

  getBounds() {
    const bounds = [];
    for (let loop of this.brepFace.loops) {
      bounds.push(loop.asPolygon().map(p => new Vector().setV(p)));
    }
    return bounds;
  }
}

function triangulatePlaneFace(face) {
  function v(data) {
    return new Vector(data[0], data[1], data[2]);
  }
  function data(v) {
    return [v.x, v.y, v.z];
  }
  const triangled = [];
  const contours = [];
  for (let loop of face.loops) {
    const contour = [];
    for (let he of loop.halfEdges) {
      contour.push(he.vertexA.point);
      he.edge.curve.approximate(10, he.vertexA.point, he.vertexB.point, contour);
    }
    contours.push(contour.map(point => data(point)));
  }
  let vertices = Triangulate(contours, data(face.surface.normal));
  for (let i = 0;  i < vertices.length; i += 3 ) {
    var a = v(vertices[i]);
    var b = v(vertices[i + 1]);
    var c = v(vertices[i + 2]);
    triangled.push([a, b, c]);
  }
  return triangled;
}

export function triangulateToThree(shell, geom) {    
  const result = [];
  let gIdx = 0;
  function addFace(face) {
    face.materialIndex = gIdx ++;
    geom.faces.push(face);
  }
  for (let brepFace of shell.faces) {
    const groupStart = geom.faces.length;
    if (brepFace.surface.constructor.name == 'Plane') {
      const polygons = triangulatePlaneFace(brepFace);
      for (let p = 0; p < polygons.length; ++p) {
        const off = geom.vertices.length;
        const poly = polygons[p];
        const vLength = poly.length;
        if (vLength < 3) continue;
        const firstVertex = poly[0];
        geom.vertices.push(threeV(firstVertex));
        geom.vertices.push(threeV(poly[1]));
        const normal = threeV(brepFace.surface.normal ? brepFace.surface.normal : normalOfCCWSeq(poly));
        for (let i = 2; i < vLength; i++) {
          geom.vertices.push(threeV(poly[i]));
          const a = off;
          const b = i - 1 + off;
          const c = i + off;
          const face = new THREE.Face3(a, b, c);
          face.normal = normal;
          addFace(face);
        }
        //view.setFaceColor(sceneFace, utils.isSmoothPiece(group.shared) ? 0xFF0000 : null);
      }
    } else if (brepFace.surface.constructor.name == 'NurbsSurface1') {
      const off = geom.vertices.length;
      const contours = [];
      
      for (let loop of brepFace.loops) {
        const points = [];
        for (let he of loop.halfEdges) {
          points.push(he.vertexA.point);
          he.edge.curve.approximate(10, he.vertexA.point, he.vertexB.point, points);
        }
        const verb = brepFace.surface.verb;
        const uvs = points.map(point => verb.closestParam(point.data()));
        uvs.forEach(uv => uv.push(0)); // add z coord
        contours.push(uvs);
        //....TODO
        for (let i = 0;  i < tessedUVs.length; i += 3 ) {
          var a = new Vector().set3(tessedUVs[i]);
          var b = new Vector().set3(tessedUVs[i + 1]);
          var c = new Vector().set3(tessedUVs[i + 2]);
          const normalOrNormals = normalOfCCWSeq([a, b, c]).three();
          const face = new THREE.Face3(off, off + 1, off + 2, normalOrNormals);
          addFace(face);
        }
      }
    } else if (brepFace.surface.constructor.name == 'NurbsSurface') {
      const off = geom.vertices.length;
      const tess = brepFace.surface.verb.tessellate({maxDepth: 3});
      tess.points.forEach(p => geom.vertices.push(new THREE.Vector3().fromArray(p))); 
      for (let faceIndices of tess.faces) {
        let normalOrNormals;
        if (SMOOTH_RENDERING) {
          normalOrNormals  = faceIndices.map(function(x){
            var vn = tess.normals[x];
            return new THREE.Vector3( vn[0], vn[1], vn[2] );
          });
        } else {
          normalOrNormals = normalOfCCWSeq(faceIndices.map(i => new Vector().set3(tess.points[i]))).three();
        }
        
        const face = new THREE.Face3(faceIndices[0] + off, faceIndices[1] + off, faceIndices[2] + off, normalOrNormals);
        addFace(face);
      }
    } else {
      throw 'unsupported;'
    }
    result.push(new FaceGroup(brepFace, groupStart, geom.faces.length));
  }
  return result;
}

class FaceGroup {
  constructor(brepFace, groupStart, groupEnd) {
    this.brepFace = brepFace;
    this.groupStart = groupStart;
    this.groupEnd = groupEnd;
  }
}

function threeV(v) {return new THREE.Vector3( v.x, v.y, v.z )}
