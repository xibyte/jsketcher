import Vector from '../../math/vector'
import {Triangulate} from '../../3d/triangulation'

export class SceneSolid {
  
  constructor(shell) {
    this.shell = shell;

    this.cadGroup = new THREE.Object3D();
    this.cadGroup.__tcad_solid = this;
    this.wireframeGroup = new THREE.Object3D();
    this.cadGroup.add(this.wireframeGroup);

    const geometry = new THREE.Geometry();
    geometry.dynamic = true;
    this.mesh = new THREE.Mesh(geometry, createSolidMaterial());
    this.cadGroup.add(this.mesh);

    this.polyFaces = [];
    this.createFaces();
    this.createEdges();
    this.createVertices();
  }
  
  createFaces() {
    let off = 0;
    let gIdx = 0;
    const geom = this.mesh.geometry;
    for (let brepFace of this.shell.faces) {
      const polyFace = new SceneFace(brepFace);
      this.polyFaces.push(polyFace);
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
          const face = new THREE.Face3(a, b, c);
          polyFace.faces.push(face);
          face.__TCAD_polyFace = polyFace;
          face.normal = normal;
          face.materialIndex = gIdx ++;
          geom.faces.push(face);
          if (brepFace.debugName == 'base') {
            face.color.set(new THREE.Color().setHex( 0x000077 ));
          }
          if (brepFace.debugName == 'wall_3') {
            face.color.set(new THREE.Color().setHex( 0x007700 ));
          }

        }
        //view.setFaceColor(polyFace, utils.isSmoothPiece(group.shared) ? 0xFF0000 : null);
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
          this.addLineToScene(halfEdge.vertexA.point, halfEdge.vertexB.point, halfEdge.edge);
        }  
      }
    }
  }
  
  createVertices() {
    
  }

  addLineToScene(a, b, edge) {
    const  lg = new THREE.Geometry();
    lg.vertices.push(a);
    lg.vertices.push(b);
    const line = new THREE.Line(lg, WIREFRAME_MATERIAL);
    line.__TCAD_edge = edge;
    this.wireframeGroup.add(line);
  };

}

const WIREFRAME_MATERIAL = new THREE.LineBasicMaterial({color: 0xff0000, linewidth: 10});

  
class SceneFace {
  constructor(brepFace) {
    this.brepFace = brepFace;
    this.faces = [];
  }
}

function triangulate(face) {
  function csgVert(data) {
    return new Vector(data[0], data[1], data[2]);
  }
  function data(v) {
    return [v.x, v.y, v.z];
  }

  var triangled = [];
  const polygons = [face.outerLoop.asPolygon()];
  for (let poly of polygons) {
    let vertices = Triangulate([poly.map(v => data(v))], data(face.surface.normal));
    for (let i = 0;  i < vertices.length; i += 3 ) {
      var a = csgVert(vertices[i]);
      var b = csgVert(vertices[i + 1]);
      var c = csgVert(vertices[i + 2]);
      triangled.push([a, b, c]);
    }
  }
  return triangled;

}


function createSolidMaterial() {
  return new THREE.MeshPhongMaterial({
    vertexColors: THREE.FaceColors,
    color: 0xB0C4DE,
    shininess: 0,
    polygonOffset : true,
    polygonOffsetFactor : 1,
    polygonOffsetUnits : 2,
    side : THREE.DoubleSide
  });
}

function threeV(v) {return new THREE.Vector3( v.x, v.y, v.z )}
