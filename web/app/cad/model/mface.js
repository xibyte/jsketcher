import {MObject} from './mobject';
import Vector from 'math/vector';
import {BasisForPlane} from '../../math/l3space';
import {MSketchObject} from './msketchObject';
import {EMPTY_ARRAY} from 'gems/iterables';
import {PointOnSurface} from '../../brep/geom/pointOnSurface';
import CSys from '../../math/csys';

export class MFace extends MObject {

  static TYPE = 'face';

  constructor(id, shell, surface, csys) {
    super(id);
    this.id = id;
    this.shell = shell;
    this.surface = surface;
    this.sketchObjects = [];
    this._csys = csys
  }

  normal() {
    return this.csys.z;
  }

  depth() {
    this.evalCSys();
    return this.w;
  }

  basis() {
    if (!this._basis) {
      this._basis = [this.csys.x, this.csys.y, this.csys.z];
    }
    return this._basis;
  }

  get csys() {
    this.evalCSys();
    return this._csys;
  }

  get isPlaneBased() {
    return this.surface.simpleSurface && this.surface.simpleSurface.isPlane;
  }
  
  evalCSys() {
    if (!this._csys) {
      if (this.isPlaneBased) {
        let [x, y, z] = this.surface.simpleSurface.basis();
        let origin = z.multiply(this.surface.simpleSurface.w);
        this._csys = new CSys(origin, x, y, z);
      } else {
        let origin = this.surface.southWestPoint();
        let z = this.surface.normalUV(0, 0);
        let derivatives = this.surface.impl.eval(0, 0, 1);
        let x = new Vector().set3(derivatives[1][0])._normalize();
        let y = new Vector().set3(derivatives[0][1])._normalize();

        if (this.surface.inverted) {
          const t = x;
          x = y;
          y = t;
        }
        this._csys = new CSys(origin, x, y, z);
      }
      this.w = this.csys.w();
    }
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
      if (this.isPlaneBased) {
        this._sketchToWorldTransformation = this.csys.outTransformation;
      } else {
        throw 'sketches are supported only for planes yet';
      }
    }
    return this._sketchToWorldTransformation;
  }
  
  get worldToSketchTransformation() {
    if (!this._worldToSketchTransformation) {
      if (this.isPlaneBased) {
        this._worldToSketchTransformation = this.csys.inTransformation;
      } else {
        throw 'sketches are supported only for planes yet';
      }
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
