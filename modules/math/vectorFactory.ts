import {veqXYZ} from 'geom/tolerance';
import Vector from './vector';

export default class VectorFactory {

  vectors: Vector[];

  constructor() {
    this.vectors = [];
  }

  addVertices(vertices: Vector[]) {
    for (const v of vertices) {
      this.vectors.push(v);
    }
  }

  find(x, y, z): Vector {
    for (const v of this.vectors) {
      if (veqXYZ(v.x, v.y, v.z, x, y, z)) {
        return v;
      }
    }
    return null;
  }

  create(x, y, z, onExistent?): Vector {
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