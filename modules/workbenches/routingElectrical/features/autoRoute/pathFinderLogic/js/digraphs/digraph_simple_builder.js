import {Digraph, GraphNode} from "./digraph.js"

// For example:
//      id= "A"
//      object= { "B": 5.3, "C": 2.1 },
// object is a map of other nodes with their weights
export function simpleObjectToGraphNode(id, object) {
  const result = new GraphNode(id);
  for (const propertyName of Object.keys(object)) {
    result.addEdge(object[propertyName], propertyName);
  }
  return result;
}

export function simpleObjectToDigraph(object) {
  const result = new Digraph();
  for (const id of Object.keys(object)) {
    const node = simpleObjectToGraphNode(id, object[id]);
    result.addNode(node);
  }
  return result;
}