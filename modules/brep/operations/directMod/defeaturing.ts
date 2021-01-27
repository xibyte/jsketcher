import {Shell} from "brep/topo/shell";
import {Vertex} from "brep/topo/vertex";
import {EdgeGraph} from "brep/operations/boolean";
import {Edge, HalfEdge} from "brep/topo/edge";
import {Plane} from "geom/impl/plane";
import {DEFLECTION, E0_TOLERANCE} from "../../../../web/app/cad/craft/e0/common";
import {EngineAPI_V1, GenericResponse} from "engine/api";

export function defeatureByEdge(shell: Shell, edge: Edge, engine: EngineAPI_V1): GenericResponse {

  const graph = new EdgeGraph();
  for (let e of shell.edges) {
    graph.add(e.halfEdge1);
    graph.add(e.halfEdge2);
  }

  const notSourceEdge = (he: HalfEdge) => he.edge !== edge;

  const edges1: HalfEdge[] = graph.vertexToEdge.get(edge.halfEdge1.vertexA);
  const [a, b] = edges1.filter(notSourceEdge).map(e => e.vertexB.point);

  const edges2: HalfEdge[] = graph.vertexToEdge.get(edge.halfEdge1.vertexB);
  const [c] = edges2.filter(notSourceEdge).map(e => e.vertexB.point);

  let plane = Plane.by3Points(a, b, c);

  if (plane.normal.multiply(plane.w).minus(edge.halfEdge1.vertexA.point).dot(plane.normal) > 1) {
    plane = plane.invert();
  }
  plane.w += E0_TOLERANCE;

  return cutOff(shell, plane, engine);
}

export function defeatureByVertex(shell: Shell, vertex: Vertex, engine: EngineAPI_V1): GenericResponse {

  const graph = new EdgeGraph();
  for (let e of shell.edges) {
    graph.add(e.halfEdge1);
    graph.add(e.halfEdge2);
  }

  const edges: HalfEdge[] = graph.vertexToEdge.get(vertex);
  const [p1, p2, p3] = edges.map(e => e.vertexB.point);
  let plane = Plane.by3Points(p1, p2, p3);

  if (plane.normal.multiply(plane.w).minus(vertex.point).dot(plane.normal) > 1) {
    plane = plane.invert();
  }

  return cutOff(shell, plane, engine);
}


function cutOff(shell: Shell, plane: Plane, engine: EngineAPI_V1) {

  return engine.splitByPlane({
    deflection: DEFLECTION,
    shape: shell.data.externals.ptr,
    plane: {
      point: plane.normal.multiply(plane.w).data(),
      dir: plane.normal.data(),
    }
  })

}