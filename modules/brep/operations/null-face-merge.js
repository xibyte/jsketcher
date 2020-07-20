import {Edge} from '../topo/edge'
import {equal} from "math/equality";

export default function({curve, start}) {

  let aE = start.prev;
  let bE = start;

//  let aStop = end;
//  let bStop = end.next;

  while (aE.vertexA !== bE.vertexB) {

    const aTip = curve.closestParam(aE.vertexA.point.data());
    const bTip = curve.closestParam(bE.vertexB.point.data());

    if (equal(aTip, bTip)) {
      //swap vertex everywhere
      updateVertex(bE, bE, aE.vertexA);
    } else if (aTip > bTip) {
      aE.split(bE.vertexB);
      aE = aE.next
    } else if (aTip < bTip) {
      bE.split(aE.vertexA);
    } else {
      throw 'illegal state'
    }
    connect(aE, bE);
    aE = aE.prev;
    bE = bE.next
  }
}

function connect(aE, bE) {
  new Edge(aE.edge.curve).link(aE.twin(), bE.twin());
}

function updateVertex(edge, stopEdge, vertex) {
  if (edge === stopEdge) return;
  const twin = edge.twin();
  edge.vertexB = twin.vertexA = vertex;
  updateVertex(twin.prev, stopEdge, vertex);
}