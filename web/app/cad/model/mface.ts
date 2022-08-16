import {MObject} from './mobject';
import Vector, {UnitVector} from 'math/vector';
import {MSketchObject} from './msketchObject';
import {EMPTY_ARRAY} from 'gems/iterables';
import CSys, {CartesianCSys} from 'math/csys';
import {MSketchLoop} from './mloop';
import {ProductionInfo} from './productionInfo';
import {MBrepShell, MShell} from "./mshell";
import BBox from "math/bbox";
import {Basis, BasisForPlane} from "math/basis";
import {Face} from "brep/topo/face";
import {EntityKind} from "cad/model/entities";
import {Matrix3x4} from "math/matrix";
import {TopoObject} from "brep/topo/topo-object";
import Axis from "math/axis";
import {MEdge} from "cad/model/medge";

export class MFace extends MObject {

  static TYPE = EntityKind.FACE;
  shell: MShell;
  surface: any;
  sketchObjects: MSketchObject[];
  sketchLoops: MSketchLoop[];
  sketch: any;
  brepFace: Face;

  private _csys: CartesianCSys;
  private w: number;
  private _basis: [UnitVector, UnitVector, UnitVector];
  private _sketchToWorldTransformation: any;
  private _worldToSketchTransformation: any;
  private _productionInfo: any;

  constructor(id, shell, surface, csys?) {
    super(MFace.TYPE, id);
    this.shell = shell;
    this.surface = surface;
    this.sketchObjects = [];
    this.sketchLoops = [];
    this._csys = csys;
  }

  normal(): UnitVector {
    return this.csys.z;
  }

  depth(): number {
    this.evalCSys();
    return this.w;
  }

  basis(): Basis {
    if (!this._basis) {
      this._basis = [this.csys.x, this.csys.y, this.csys.z];
    }
    return this._basis;
  }

  get csys(): CartesianCSys {
    this.evalCSys();
    return this._csys;
  }

  get isPlaneBased(): boolean {
    return this.surface.simpleSurface && this.surface.simpleSurface.isPlane;
  }

  evalCSys() {
    if (!this._csys) {
      if (this.isPlaneBased) {
        const alignCsys = (this.shell && this.shell.csys) || CSys.ORIGIN;
        const [x, y, z] = BasisForPlane(this.surface.simpleSurface.normal, alignCsys.y, alignCsys.z);
        let proj = z.dot(alignCsys.origin);
        proj -= this.surface.simpleSurface.w;
        const origin = alignCsys.origin.minus(z.multiply(proj));
        this._csys = new CSys(origin, x, y, z) as CartesianCSys;
      } else {
        const origin = this.surface.southWestPoint();
        const z = this.surface.normalUV(0, 0);
        const derivatives = this.surface.impl.eval(0, 0, 1);
        let x = new Vector().set3(derivatives[1][0])._normalize();
        let y = new Vector().set3(derivatives[0][1])._normalize();

        if (this.surface.inverted) {
          const t = x;
          x = y;
          y = t;
        }
        this._csys = new CSys(origin, x, y, z) as CartesianCSys;
      }
      this.w = this.csys.w();
    }
  }

  get defaultSketchId() {
    return this.id;
  }

  setSketch(sketch) {

    if (!this.isPlaneBased) {
      return;
    }

    this.sketch = sketch;
    this.sketchObjects = [];

    if (!sketch) {
      return;
    }

    const addSketchObjects = sketchObjects => {
      const isConstruction = sketchObjects === sketch.constructionSegments;
      for (const sketchObject of sketchObjects) {
        const mSketchObject = new MSketchObject(this, sketchObject);
        mSketchObject.construction = isConstruction;
        this.sketchObjects.push(mSketchObject);
      }
    };
    addSketchObjects(sketch.constructionSegments);
    addSketchObjects(sketch.connections);
    addSketchObjects(sketch.loops);


    const index = new Map();
    this.sketchObjects.forEach(o => index.set(o.sketchPrimitive, o));

    this.sketchLoops = sketch.fetchContours().map((contour, i) => {
      const loopSketchObjects = contour.segments.map(s => index.get(s));
      return new MSketchLoop(this.id + '/L:' + i, this, loopSketchObjects, contour);
    });

  }

  findSketchObjectById(sketchObjectId) {
    for (const o of this.sketchObjects) {
      if (o.id === sketchObjectId) {
        return o;
      }
    }
  }

  getBounds() {
    return EMPTY_ARRAY;
  }

  get sketchToWorldTransformation(): Matrix3x4 {
    if (!this._sketchToWorldTransformation) {
      this._sketchToWorldTransformation = this.csys.outTransformation;
    }
    return this._sketchToWorldTransformation;
  }

  get worldToSketchTransformation(): Matrix3x4 {
    if (!this._worldToSketchTransformation) {
      this._worldToSketchTransformation = this.csys.inTransformation;
    }
    return this._worldToSketchTransformation;
  }

  traverse(callback: (obj: MObject) => void) {
    callback(this);
    this.traverseSketchRelatedEntities(callback);
  }

  traverseSketchRelatedEntities(callback: (obj: MObject) => void) {
    this.sketchObjects.forEach(i => i.traverse(callback));
    this.sketchLoops.forEach(i => i.traverse(callback));
  }

  get parent() {
    return this.shell;
  }

  get favorablePoint() {
    return this.csys.origin;    
  }

  get topology(): TopoObject {
    return this.brepFace;
  }

  get edges(): MEdge[] {
    return [];
  }
}

export class MBrepFace extends MFace {

  #favorablePoint: Vector;

  constructor(id, shell, brepFace) {
    super(id, shell, brepFace.surface);
    this.id = id;
    this.brepFace = brepFace;
  }

  get edges(): MEdge[] {
    const out = [];
    for (const he of this.brepFace.edges) {
      const edge = (this.shell as MBrepShell).brepRegistry.get(he.edge);
      if (edge) {
        out.push(edge);
      }
    }
    return out;
  }
  
  getBounds() {
    const bounds = [];
    for (const loop of this.brepFace.loops) {
      bounds.push(loop.asPolygon().map(p => new Vector().setV(p)));
    }
    return bounds;
  }

  get favorablePoint() {
    if (!this.#favorablePoint) {
      const bbox = new BBox();
      const outerPoly = this.brepFace.outerLoop.asPolygon();
      if (outerPoly) {
        outerPoly.forEach(pt => {
          const pt2d = this.csys.outTransformation.apply(pt);
          bbox.checkPoint(pt2d);
        });
        this.#favorablePoint = this.csys.inTransformation.apply(bbox.center());
      } else {
        this.#favorablePoint = this.surface.pointInMiddle;
      }
    }
    return this.#favorablePoint;
  }

  toDirection(): UnitVector {
    return this.normal();
  }

  toAxis(reverse: boolean): Axis {
    const dir = this.toDirection();
    if (reverse) {
      dir._negate();
    }
    return new Axis(this.favorablePoint, dir);
  }

}
