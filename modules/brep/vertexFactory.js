import {Vertex} from './topo/vertex';
import {veqXYZ} from 'geom/tolerance';
import {Point} from 'geom/point';

export default class VertexFactory {

  constructor() {
    this.vertices = [];
  }

  get(_x, _y, _z) {
    for (let vertex of this.vertices) {
      let {x, y, z} = vertex.point;
      if (veqXYZ(_x, _y, _z, x, y, z)) {
        return vertex;
      }
    }
    let v = new Vertex(new Point(_x, _y, _z));
    this.vertices.push(v);
    return v;
  }

  getPoint({x, y, z}) {
    return this.get(x, y, z);
  }

  getData([x, y, z]) {
    return this.get(x, y, z);
  }
}


