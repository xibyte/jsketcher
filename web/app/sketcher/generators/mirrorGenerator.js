import Vector from "math/vector";
import {Segment} from "../shapes/segment";
import {MirrorGeneratorIcon} from "../icons/generators/GeneratorIcons";

export const MirrorGeneratorSchema = {

  id: 'Mirror',
  title: 'Mirror',
  description: 'Reflects objects off of a given line',
  icon: MirrorGeneratorIcon,
  persistGeneratedObjects: true,

  params: [
    {
      name: 'reflectionLine',
      label: 'reflection line',
      type: 'selection',
      minQuantity: 1,
      maxQuantity: 1,
      capture: 'tool',
      placeholder: '<select a line>',
      filter: [Segment]
    },
    {
      name: 'objects',
      type: 'selection',
      minQuantity: 1,
      maxQuantity: Infinity,
      capture: 'highlight',
      placeholder: '<select objects>',
      filter: null
    }
  ],

  sourceObjects: (params, callback) => {
    params.reflectionLine.forEach(callback);
    params.objects.forEach(callback);
  },

  removeObject(params, generatedObjects, object, destroy, fullDestroy) {

    const {reflectionLine: [reflectionLine], objects} = params;

    if (object === reflectionLine) {
      fullDestroy();
    } else {
      const index = objects.indexOf(object);
      if (index !== -1) {
        objects.splice(index, 1);
        destroy(generatedObjects[index]);
        generatedObjects.splice(index, 1);
      }
    }
  },

  initiateState: state => {
    state.dir = new Vector();
  },

  generate: (params, state) => {

    const {reflectionLine: [reflectionLine], objects} = params;

    updateDir(state.dir, reflectionLine);

    return objects.map(o => {
      const copy = o.copy();
      reflect(state.dir, reflectionLine, o, copy);
      return copy;
    });
  },

  regenerate: (params, generatedObjects, state) => {

    const {reflectionLine: [reflectionLine], objects} = params;

    updateDir(state.dir, reflectionLine);

    for (let i = 0; i < objects.length; i++) {
      reflect(state.dir, reflectionLine, objects[i], generatedObjects[i]);
    }
  }

};

function updateDir(dir, reflectionLine) {
  dir.set(-(reflectionLine.b.y - reflectionLine.a.y), reflectionLine.b.x - reflectionLine.a.x, 0)._normalize();
}

function reflect(dir, reflectionLine, source, dest) {
  const origin = reflectionLine.a.toVector();

  const pointMirroring = (x, y) => {
    const pt = new Vector(x, y, 0);
    const proj = dir.dot(pt.minus(origin));
    return dir.multiply(- proj * 2)._plus(pt);
  };

  source.mirror(dest, pointMirroring);
}
