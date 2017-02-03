import Vector from '../../math/vector'
import {Triangulate} from '../../3d/triangulation'
import {SceneSolid, SceneFace} from './scene-object'

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
    let off = 0;
    let gIdx = 0;
    const geom = this.mesh.geometry;
    for (let brepFace of this.shell.faces) {
      const sceneFace = new BREPSceneFace(brepFace, this);
      this.sceneFaces.push(sceneFace);
      const polygons = triangulate(brepFace);
      for (let p = 0; p < polygons.length; ++p) {
        const poly = polygons[p];
        const vLength = poly.length;
        if (vLength < 3) continue;
        const firstVertex = poly[0];
        geom.vertices.push(threeV(firstVertex));
        geom.vertices.push(threeV(poly[1]));
        const normal = threeV(brepFace.surface.normal);
        for (let i = 2; i < vLength; i++) {
          geom.vertices.push(threeV(poly[i]));
          const a = off;
          const b = i - 1 + off;
          const c = i + off;
          const face = sceneFace.createMeshFace(a, b, c);
          face.normal = normal;
          face.materialIndex = gIdx ++;
          geom.faces.push(face);
          if (brepFace.debugName == 'base') {
            face.color.set(new THREE.Color().setHex( 0x000077 ));
          }
        }
        //view.setFaceColor(sceneFace, utils.isSmoothPiece(group.shared) ? 0xFF0000 : null);
        off = geom.vertices.length;
      }
    }
    geom.mergeVertices();
  }

  createEdges() {
    const visited = new Set();
    for (let face of this.shell.faces) {
      for (let halfEdge of face.outerLoop.halfEdges) {
        if (!visited.has(halfEdge.edge)) {
          visited.add(halfEdge.edge);
          this.addLineToScene(halfEdge.vertexA.point.three(), halfEdge.vertexB.point.three(), halfEdge.edge);
        }
      }
    }
  }

  createVertices() {
  }
}

class BREPSceneFace extends SceneFace {
  constructor(brepFace, solid) {
    super(solid);
    this.brepFace = brepFace;
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

function triangulate(face) {
  function csgVert(data) {
    return new Vector(data[0], data[1], data[2]);
  }
  function data(v) {
    return [v.x, v.y, v.z];
  }

  const triangled = [];
  const contours = [];
  for (let loop of face.loops) {
    contours.push(loop.asPolygon().map(point => data(point)));
  }

  let vertices = Triangulate(contours, data(face.surface.normal));
  for (let i = 0;  i < vertices.length; i += 3 ) {
    var a = csgVert(vertices[i]);
    var b = csgVert(vertices[i + 1]);
    var c = csgVert(vertices[i + 2]);
    triangled.push([a, b, c]);
  }
  return triangled;

}

function threeV(v) {return new THREE.Vector3( v.x, v.y, v.z )}
