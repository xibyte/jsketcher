import {HashTable} from '../../utils/hashmap'
import Vector from '../../math/vector'
import Counters from '../counters'
import {findOutline, segmentsToPaths} from '../workbench'
import {Matrix3, AXIS} from '../../math/l3space'
import {arrFlatten1L, isCurveClass} from '../cad-utils'
import DPR from '../../utils/dpr'

export class SceneSolid {
  
  constructor(type, id) {
    this.tCadType = type || 'SOLID';

    this.cadGroup = new THREE.Object3D();
    this.cadGroup.__tcad_solid = this;

    this.tCadId = Counters.solid ++;
    this.id = id === undefined ? this.tCadId : id; // to keep identity through the history
    this.faceCounter = 0;

    this.wireframeGroup = new THREE.Object3D();
    this.cadGroup.add(this.wireframeGroup);
    this.mergeable = true;
    this.sceneFaces = [];

    this.material = createSolidMaterial();
  }

  addLineToScene(a, b) {
    var lg = new THREE.Geometry();
    lg.vertices.push(a);
    lg.vertices.push(b);
    var line = new THREE.Line(lg, WIREFRAME_MATERIAL);
    this.wireframeGroup.add(line);
  }

  createGeometry() {
    throw 'not implemented';
  }

  dropGeometry() {
    throw 'not implemented';
  }

  vanish() {
    throw 'not implemented';
  }
}

function createSolidMaterial() {
  return new THREE.MeshPhongMaterial({
    vertexColors: THREE.FaceColors,
    color: 0xB0C4DE,
    shininess: 0,
    polygonOffset : true,
    polygonOffsetFactor : 1,
    polygonOffsetUnits : 2,
    //side : THREE.DoubleSide
  });
}

export class SceneFace {
  constructor(solid, propagatedId) {
    if (propagatedId === undefined) {
      this.id = solid.tCadId + ":" + (solid.faceCounter++);
    } else {
      this.id = propagatedId;
    }

    this.solid = solid;
    this.meshFaces = [];
    this.sketch3DGroup = null;
  }

  normal() {
    throw 'not implemented';
  }

  depth() {
    throw 'not implemented';
  }
  
  getBounds() {
    throw 'not implemented';
  }
  
  calcBasis() {
    const normal = this.normal();
    let alignPlane, x, y;
    if (Math.abs(normal.dot(AXIS.Y)) < 0.5) {
      alignPlane = normal.cross(AXIS.Y);
    } else {
      alignPlane = normal.cross(AXIS.Z);
    }
    y = alignPlane.cross(normal);
    x = y.cross(normal);
    return [x, y, normal];
  };

  basis() {
    if (!this._basis) {
      this._basis = this.calcBasis();
    }
    return this._basis;
  }

  createMeshFace(a, b, c) {
    const face = new THREE.Face3(a, b, c);
    this.meshFaces.push(face);
    face.__TCAD_SceneFace = this;
    return face;
  }
  
  syncSketches(geom) {
    const normal = this.normal();
    const offVector = new Vector();//normal.multiply(0); // disable it. use polygon offset feature of material

    if (this.sketch3DGroup != null) {
      for (let i = this.sketch3DGroup.children.length - 1; i >= 0; --i) {
        this.sketch3DGroup.remove(this.sketch3DGroup.children[i]);
      }
    } else {
      this.sketch3DGroup = new THREE.Object3D();
      this.solid.cadGroup.add(this.sketch3DGroup);
    }

    const basis = this.basis();
    const _3dTransformation = new Matrix3().setBasis(basis);
    //we lost depth or z off in 2d sketch, calculate it again
    const depth = this.depth();
    const polyLines = new Map();
    function addSketchConnections(connections, material) {
      for (let i = 0; i < connections.length; ++i) {
        const l = connections[i];

        let line = polyLines.get(l.sketchObject.id);
        if (!line) {
          line = new THREE.Line(undefined, material);
          line.__TCAD_SketchObject = l.sketchObject;
          polyLines.set(l.sketchObject.id, line);
        }
        const lg = line.geometry;
        l.a.z = l.b.z = depth;
        const a = _3dTransformation.apply(l.a);
        const b = _3dTransformation.apply(l.b);

        lg.vertices.push(a.plus(offVector).three());
        lg.vertices.push(b.plus(offVector).three());
      }

    }
    addSketchConnections(geom.constructionSegments, SKETCH_CONSTRUCTION_MATERIAL);
    addSketchConnections(geom.connections, SKETCH_MATERIAL);
    addSketchConnections(arrFlatten1L(geom.loops), SKETCH_MATERIAL);

    for (let line of polyLines.values()) {
      this.sketch3DGroup.add(line);
    }
  }

  findById(sketchObjectId) {
    return this.sketch3DGroup.children.find(o => o.__TCAD_SketchObject && o.__TCAD_SketchObject.id == sketchObjectId);
  }

  getSketchObjectVerticesIn3D(sketchObjectId) {
    const object = this.findById(sketchObjectId);
    if (!object) {
      return undefined;
    }
    return object.geometry.vertices;
  }
}

const SKETCH_MATERIAL = new THREE.LineBasicMaterial({color: 0xFFFFFF, linewidth: 3/DPR});
const SKETCH_CONSTRUCTION_MATERIAL = new THREE.LineBasicMaterial({color: 0x777777, linewidth: 2/DPR});
const WIREFRAME_MATERIAL = new THREE.LineBasicMaterial({color: 0x2B3856, linewidth: 3/DPR});
