import {Vertex} from './topo/vertex';
import {veqXYZ} from 'geom/tolerance';
import {Point} from 'geom/point';
import {XYZ} from "math/xyz";
import {VectorData} from "math/vec";

export default class VertexFactory {

  vertices: Vertex[];

  constructor() {
    this.vertices = [];
  }

  get(_x: number, _y: number, _z: number): Vertex {
    for (const vertex of this.vertices) {
      const {x, y, z} = vertex.point;
      if (veqXYZ(_x, _y, _z, x, y, z)) {
        return vertex;
      }
    }
    const v = new Vertex(new Point(_x, _y, _z));
    this.vertices.push(v);
    return v;
  }

  getPoint({x, y, z}: XYZ): Vertex {
    return this.get(x, y, z);
  }

  getData([x, y, z]: VectorData): Vertex {
    return this.get(x, y, z);
  }
}


