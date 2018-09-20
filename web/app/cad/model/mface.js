import {MObject} from './mobject';
import Vector from 'math/vector';
import {BasisForPlane} from '../../math/l3space';
import {MSketchObject} from './msketchObject';
import {EMPTY_ARRAY} from 'gems/iterables';
import {PointOnSurface} from '../../brep/geom/pointOnSurface';
import CSys from '../../math/csys';

export class MFace extends MObject {

  static TYPE = 'face';

  constructor(id, shell, surface) {
    super(id);
    this.id = id;
    this.shell = shell;
    this.surface = surface;
    this.sketchObjects = [];
  }

  normal() {
    return this.surface.normalInMiddle();
  }

  depth() {
    return this.surface.tangentPlaneInMiddle().w;
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

  setSketch(sketch) {
    this.sketch = sketch;
    this.sketchObjects = [];

    const addSketchObjects = sketchObjects => {
      let isConstruction = sketchObjects === sketch.constructionSegments;
      for (let sketchObject of sketchObjects) {
        let mSketchObject = new MSketchObject(this, sketchObject);
        mSketchObject.construction = isConstruction;
        this.sketchObjects.push(mSketchObject);
      }
    };
    addSketchObjects(sketch.constructionSegments);
    addSketchObjects(sketch.connections);
    addSketchObjects(sketch.loops);
  }

  findSketchObjectById(sketchObjectId) {
    for (let o of this.sketchObjects) {
      if (o.id === sketchObjectId) {
        return o;
      }
    }
  }

  getBounds() {
    return EMPTY_ARRAY;
  }

  get sketchToWorldTransformation() {
    if (!this._sketchToWorldTransformation) {
      this._sketchToWorldTransformation = this.surface.tangentPlaneInMiddle().get3DTransformation();
    }
    return this._sketchToWorldTransformation;
  }
  
  get worldToSketchTransformation() {
    if (!this._worldToSketchTransformation) {
      this._worldToSketchTransformation = this.sketchToWorldTransformation.invert();
    }
    return this._worldToSketchTransformation;
  }
}

export class MBrepFace extends MFace {

  constructor(id, shell, brepFace) {
    super(id, shell, brepFace.surface);
    this.id = id;
    this.brepFace = brepFace;
  }

  getBounds() {
    const bounds = [];
    for (let loop of this.brepFace.loops) {
      bounds.push(loop.asPolygon().map(p => new Vector().setV(p)));
    }
    return bounds;
  }
}
