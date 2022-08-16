import {IDENTITY_MATRIX, Matrix3x4} from "math/matrix";
import {EntityKind} from "cad/model/entities";
import Vector, {UnitVector} from "math/vector";
import {TopoObject} from "brep/topo/topo-object";
import Axis from "math/axis";
import {ProductionInfo} from "cad/model/productionInfo";

export abstract class MObject {

  TYPE: EntityKind;
  
  id: string;
  originatingOperation: number = -1;
  ext: any = {};

  protected constructor(TYPE, id) {
    this.TYPE = TYPE;
    this.id = id;
  }

  traverse(callback: (obj: MObject) => void): void {
    callback(this);
  }

  abstract get parent();

  toDirection(): UnitVector {
    return null;
  }

  toAxis(reverse: boolean): Axis {
    return null;
  }

  get root(): MObject {
    let obj = this;
    while (obj.parent) {
      obj = obj.parent;
    }
    return obj;
  }

  get location() {
    return IDENTITY_MATRIX;
  }

  get topology(): TopoObject {
    return null;
  }

  get productionInfo(): any {
    return this.topology?.data?.productionInfo;
  }
}

export const MObjectIdGenerator = {

  contexts: [{
    namespace: '',
    ID_REGISTRY: new Map()
  }],

  get context() {
    return this.contexts[this.contexts.length - 1];
  },

  next(entityType, prefix) {
    const context = this.context;
    const id = context.ID_REGISTRY.get(entityType) || 0;
    context.ID_REGISTRY.set(entityType, id + 1);
    return (context.namespace && '|') + prefix + ':' + id;
  },

  reset() {
    this.context.ID_REGISTRY.clear()
  },

  pushContext(namespace: string) {
    this.contexts.push({
      namespace,
      ID_REGISTRY: new Map()
    })
  },

  popContext() {
    this.contexts.pop();
  }

};

