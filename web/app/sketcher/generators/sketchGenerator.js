import {NOOP} from "gems/func";
import {MirrorGeneratorSchema} from "./mirrorGenerator";
import {memoize} from "lodash/function";
import {indexArray} from "gems/iterables";
import {PREDEFINED_LAYERS} from "../viewer2d";

const SCHEMAS = [
  MirrorGeneratorSchema,
];

const SCHEMAS_INDEX = indexArray(SCHEMAS, schema => schema.id);

const indexByName = memoize(arr => indexArray(arr, param => param.name));

export class SketchGenerator {

  static ID = 0;

  constructor(params, schema) {
    this.id = schema.id + (SketchGenerator.ID ++);
    this.params = params;
    this.schema = schema;
    this.internalState = {};
    this.stage = null;
    this.sourceObjects(obj => obj.generators.add(this));
  }

  sourceObjects(callback) {
    this.schema.sourceObjects(this.params, callback);
  }

  init() {
    this.schema.initiateState(this.internalState);
  }

  generate(viewer) {
    this.init();
    let layer = viewer.findLayerByName(PREDEFINED_LAYERS.SKETCH);
    this.generatedObjects = this.schema.generate(this.params, this.internalState);
    this.generatedObjects.forEach(obj => {
      obj.generator = this;
      this.stage.assignObject(obj);
      layer.objects.push(obj);
      obj.syncGeometry()
    });
    viewer.objectsUpdate();
  }

  regenerate(viewer) {
    this.schema.regenerate(this.params, this.generatedObjects, this.internalState);
    this.generatedObjects.forEach(obj => obj.syncGeometry());
  }

  removeObject(obj, destroy, fullDestroy) {
    this.schema.removeObject(this.params, this.generatedObjects, obj, destroy, fullDestroy);
  }

  static read(data, objectIndex) {

    const {typeId, params} = data;

    const schema = SCHEMAS_INDEX[typeId];

    if (!schema) {
      throw `generator ${typeId} doesn't exist`
    }

    const realParams = {};
    Object.keys(params).forEach(key => {
      let param = params[key];
      const pSchema = indexByName(schema.params)[key];
      if (pSchema && pSchema.type === 'selection') {
        param = (param||[]).map(id => objectIndex[id]);
      }
      realParams[key] = param;
    });

    const sketchGenerator = new SketchGenerator(realParams, schema);
    sketchGenerator.generatedObjects = data.generatedObjects.map(id => {
      const restoredObject = objectIndex[id];
      if (!restoredObject) {
        throw 'generator refers to non existent object';
      }
      restoredObject.generator = sketchGenerator;
      return restoredObject;
    });
    sketchGenerator.init();
    return sketchGenerator;
  }

  write() {

    const schema = SCHEMAS_INDEX[this.schema.id];

    if (!schema) {
      throw `generator ${this.schema.id} doesn't exist`
    }

    const params = {};
    Object.keys(this.params).forEach(key => {
      let param = this.params[key];
      const pSchema = indexByName(schema.params)[key];
      if (pSchema && pSchema.type === 'selection' && Array.isArray(param)) {
        param = param.map(obj => obj.id);
      }
      params[key] = param;
    });

    return {
      typeId: schema.id,
      params,
      stage: this.stage&&this.stage.index,
      generatedObjects: this.schema.persistGeneratedObjects ? this.generatedObjects.map(obj => obj.id) : undefined
    };
  }
}