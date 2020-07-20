import {TriangulateFace} from '../../../web/app/cad/tess/triangulation'
import {Shell} from '../topo/shell'
import {HalfEdge} from '../topo/edge'
import {Loop} from '../topo/loop'
import {Face} from '../topo/face'
import {BREPValidator} from '../brep-validator';
import {linkSegments} from '../brep-builder';
import {Line} from 'geom/impl/line'

export function polyhedronify(shell) {
  shell.reindexVertices();
  const faces = [];
  
  const edgeIndex = new EdgeIndex();
  
  for (let face of shell.faces) {
    const plane = face.surface;
    const triangles = TriangulateFace(face);
    for (let triangle of triangles) {
      const loop = new Loop();
      const n = triangle.length; // obviously it's 3
      for (let p = n - 1, q = 0; q < n; p = q++) {
  
        const a = triangle[p];
        const b = triangle[q];
  
        const edge = edgeIndex.get(a, b);
        edge.loop = loop;
        loop.halfEdges.push(edge);
        if (a.edgeFor(b) != null) {
          edge.data.outline = true;
          __DEBUG__.AddHalfEdge(edge, 0x00ff00);
        } else {
          __DEBUG__.AddHalfEdge(edge, 0xffffff);
        }
      }
      const newFace = new Face(face.surface);
      newFace.outerLoop = loop;
      loop.face = newFace;
      newFace.data.originFace = face;
      linkSegments(loop.halfEdges);
      faces.push(newFace);
    }
  }
  const polyhedron = new Shell();
  faces.forEach(face => {
    face.shell = polyhedron;
    polyhedron.faces.push(face);
  });

  BREPValidator.validateToConsole(polyhedron);

  return polyhedron;
}

class EdgeIndex {
  
  constructor() {
    this.index = new Map();
  }
  
  get(a, b) {
    const subMap = this.getForPoint(a);
    let edge = subMap.get(b);

    if (edge == null) {
      
      edge = HalfEdge.fromVertices(a, b, Line.fromSegment(a.point, b.point));
      subMap.set(b, edge);
      const twinMap = this.getForPoint(b);
      if (twinMap.has(a)) {
        throw 'illegal state';
      }
      twinMap.set(a, edge.twin());
    }
    return edge;
  }
  
  getForPoint(p) {
    let subMap = this.index.get(p);
    if (subMap == null) {
      subMap = new Map();
      this.index.set(p, subMap);
    }
    return subMap;
  }
}
