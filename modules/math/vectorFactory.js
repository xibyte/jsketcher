import {veqXYZ} from 'geom/tolerance';
import Vector from './vector';

export default class VectorFactory {

  constructor(tolerance) {
    this.vectors = [];
  }

  addVertices(vertices) {
    for (let v of vertices) {
      this.vectors.push(v);
    }
  }

  find(x, y, z) {
    for (let v of this.vectors) {
      if (veqXYZ(v.x, v.y, v.z, x, y, z)) {
        return v;
      }
    }
    return null;
  }

  create(x, y, z, onExistent) {
    let vector = this.find(x, y, z);
    if (vector === null) {
      vector = new Vector(x, y, z);
      this.vectors.push(vector);
    } else if (onExistent !== undefined) {
      return onExistent(vector);
    }
    return vector;
  }
}