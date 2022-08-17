export class GraphNode {
  constructor(id) {
    if (id == null) {
      throw "Null id";
    }
    this.id = id;
    this.weights = [];
    this.neighbourIds = [];
    this.edgeIds = [];
    // Note: edgeIds is an optional additional information about edges, not important for processing
    this.numberOfEdges = 0;
  }

  addEdge(weight, otherNodeId, edgeId) {
    this.weights.push(weight);
    this.neighbourIds.push(otherNodeId);
    this.edgeIds.push(edgeId ?? this.id + "->" + otherNodeId);
    this.numberOfEdges++;
  }

  getWeight(k) {
    return this.weights[k];
  }

  getNeighbourId(k) {
    return this.neighbourIds[k];
  }

  getEdgeId(k) {
    return this.edgeIds[k];
  }
}

export class Digraph {
  constructor() {
    this.nodeMap = new Map();
  }

  addNode(node) {
    const id = node.id;
    if (id == null) {
      throw "Null id in " + node + ": probably it is not a graph node";
    }
    this.nodeMap.set(id, node);
  }

  addNodes(nodes) {
    for (const node of nodes) {
      this.addNode(node);
    }
  }

  getNode(id) {
    return this.nodeMap.get(id);
  }

  getAllNodeIds() {
    return this.nodeMap.keys();
  }

  getNumberOfNodes() {
    return this.nodeMap.size;
  }

  toJson(limitOfNodes) {
    const json = {};
    let count = 0;
    for (const [id, node] of this.nodeMap) {
      const nodeJson = {};
      for (let k = 0; k < node.numberOfEdges; k++) {
        nodeJson[node.getNeighbourId(k)] = node.getWeight(k)
      }
      json[id] = nodeJson;
      ++count;
      if (limitOfNodes && count > limitOfNodes) {
        json["other_nodes"] = "cannot be shown (more than " + limitOfNodes + " nodes)";
        break;
      }
    }
    return json;
  }

  toJsonString(limitOfNodes, space) {
    return JSON.stringify(this.toJson(limitOfNodes), null, space);
  }
}
