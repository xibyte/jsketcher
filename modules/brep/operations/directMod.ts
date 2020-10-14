import {Face} from "brep/topo/face";
import {Vertex} from "brep/topo/vertex";
import {Edge, HalfEdge} from "brep/topo/edge";
import {Shell} from "brep/topo/shell";


export function pullFace(face: Face, dist: number) {
  const map = mapVertices(face.shell);
  const dir = face.surface.normalInMiddle();
  for (let edge of face.edges) {

    const v = edge.vertexA;
    const adjEdges = map.get(v);
    const movingEdge = findForeignEdge(adjEdges, face);
    let tang = v === movingEdge.halfEdge1.vertexA ? movingEdge.halfEdge1.tangentAtStart():movingEdge.halfEdge1.tangentAtEnd();

    if (dir.dot(tang) < 0) {
      tang = tang.negate();
    }

    const vec = dir.cross(tang)._normalize().cross(dir)._normalize();
    const x = dist / tang.dot(dir);
    v.point._plus(tang.multiply(x));
  }
}

function findForeignEdge(adjEdges: HalfEdge[], face): Edge {
  for (let he of adjEdges) {

    if (he.loop.face != face && he.twin().loop.face != face) {
      return he.edge;
    }
  }

  return null;

}

function mapVertices(shell: Shell): Map<Vertex, HalfEdge[]> {
  const map = new Map<Vertex, HalfEdge[]>();
   for (let face of shell.faces) {
     for (let edge of face.edges) {
       let edges = map.get(edge.vertexA);
       if (!edges) {
         edges = [];
         map.set(edge.vertexA, edges);
       }
       edges.push(edge);
     }
   }
   return map;
}
