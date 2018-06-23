import Vector from 'math/vector';
import {BasisForPlane} from '../../../math/l3space'
import DPR from 'dpr'
import {setAttribute} from "scene/objectData";
import {genSolidId} from "../../craft/cadRegistryPlugin";
import {getAttribute} from '../../../../../modules/scene/objectData';

//todo: rename to shell
export class SceneSolid {
  
  constructor(type, id, skin) {
    this.tCadType = type || 'SHELL';

    this.cadGroup = new THREE.Object3D();
    setAttribute(this.cadGroup, 'shell',  this);

    this.tCadId = genSolidId();
    this.id = id === undefined ? this.tCadId : id; // to keep identity through the history
    this.faceCounter = 0;
    this.edgeCounter = 0;

    this.wireframeGroup = new THREE.Object3D();
    this.cadGroup.add(this.wireframeGroup);
    this.mergeable = true;
    this.sceneFaces = [];
    this.sceneEdges = [];

    this.sketch = null;
    
    this.material = createSolidMaterial(skin);
  }

  addLineToScene(a, b) {
    let lg = new THREE.Geometry();
    lg.vertices.push(a);
    lg.vertices.push(b);
    let line = new THREE.Line(lg, WIREFRAME_MATERIAL);
    this.wireframeGroup.add(line);
    return line;
  }
  
  dispose() {
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}

export function createSolidMaterial(skin) {
  return new THREE.MeshPhongMaterial(Object.assign({
    vertexColors: THREE.FaceColors,
    color: 0xB0C4DE,
    shininess: 0,
    polygonOffset : true,
    polygonOffsetFactor : 1,
    polygonOffsetUnits : 2
  }, skin));
}

const OFF_LINES_VECTOR = new Vector();//normal.multiply(0); // disable it. use polygon offset feature of material

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

  surface() {
    throw 'not implemented';
  }

  calcBasis() {
    return BasisForPlane(this.normal());    
  };

  basis() {
    if (!this._basis) {
      this._basis = this.calcBasis();
    }
    return this._basis;
  }

  createMeshFace(a, b, c, normales) {
    const face = new THREE.Face3(a, b, c, normales);
    this.registerMeshFace(face);
    return face;
  }

  registerMeshFace(threeFace) {
    this.meshFaces.push(threeFace);
    setAttribute(threeFace, 'face', this);
  }

  updateSketch(sketch) {
    this.sketch = sketch;
    if (this.sketch !== null) {
      this.syncSketch(this.sketch);
    }
  }
  
  syncSketch(geom) {
    if (this.sketch3DGroup !== null) {
      for (let i = this.sketch3DGroup.children.length - 1; i >= 0; --i) {
        this.sketch3DGroup.remove(this.sketch3DGroup.children[i]);
      }
    } else {
      this.sketch3DGroup = new THREE.Object3D();
      this.solid.cadGroup.add(this.sketch3DGroup);
    }

    let surface = this.surface();
    const _3dTransformation =  surface.tangentPlaneInMiddle().get3DTransformation();
    const addSketchObjects = (sketchObjects, material, close) => {
      for (let sketchObject of sketchObjects) {
        let line = new THREE.Line(new THREE.Geometry(), material);
        let sceneSketchObject = new SceneSketchObject(sketchObject, line);
        setAttribute(line, 'sketchObject', sceneSketchObject);
        const chunks = sketchObject.tessellate(10);
        function addLine(p, q) {
          const lg = line.geometry;
          const a = _3dTransformation.apply(chunks[p]);
          const b = _3dTransformation.apply(chunks[q]);

          lg.vertices.push(a._plus(OFF_LINES_VECTOR).three());
          lg.vertices.push(b._plus(OFF_LINES_VECTOR).three());
        }
        for (let q = 1; q < chunks.length; q ++) {
          addLine(q - 1, q);
        }
        this.sketch3DGroup.add(line);
      }
    };
    addSketchObjects(geom.constructionSegments, SKETCH_CONSTRUCTION_MATERIAL);
    addSketchObjects(geom.connections, SKETCH_MATERIAL);
    addSketchObjects(geom.loops, SKETCH_MATERIAL);
  }

  findById(sketchObjectId) {
    for (let o of this.sketch3DGroup.children) {
      let sceneSketchObject = getAttribute(o, 'sketchObject');
      if (sceneSketchObject && sceneSketchObject.id === sketchObjectId) {
        return sceneSketchObject;  
      }
    }
  }

  getSketchObjectVerticesIn3D(sketchObjectId) {
    const object = this.findById(sketchObjectId);
    if (!object) {
      return undefined;
    }
    return object.geometry.vertices;
  }
}


export class SceneEdge {
  
  constructor(curve, solid, representation, marker) {
    this.id = solid.tCadId + ":" + (solid.edgeCounter++);
    this.curve = curve;
    this.solid = solid;
    this.representation = representation;
    this.marker = marker;
  }
}

export class SceneSketchObject {

  constructor(model, viewObject) {
    this.id = model.id;
    this.model = model;
    this.viewObject = viewObject;
  }
}

export const SKETCH_MATERIAL = new THREE.LineBasicMaterial({color: 0xFFFFFF, linewidth: 3/DPR});
export const SKETCH_CONSTRUCTION_MATERIAL = new THREE.LineBasicMaterial({color: 0x777777, linewidth: 2/DPR});
export const WIREFRAME_MATERIAL = new THREE.LineBasicMaterial({color: 0x2B3856, linewidth: 3/DPR});
