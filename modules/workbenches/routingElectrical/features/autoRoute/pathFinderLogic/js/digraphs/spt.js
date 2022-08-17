import {MinHeap} from "../heap/min_heap.js"

class NodeAndDistance {
  // counter allows to provide stable behaviour order, identical to SimpleDistanceHeap
  constructor(nodeId, distance, globalCounter) {
    this.nodeId = nodeId;
    this.distance = distance;
    this.counter = globalCounter ?? 0;
  }
}

let _USE_MIN_HEAP = true;

// For debugging needs; usually should be true
export function _setUseMinHeap(value) {
  _USE_MIN_HEAP = value;
}

function nodeAndDistanceLess(a, b) {
  const result = a.distance < b.distance || (a.distance == b.distance && a.counter < b.counter);
//    console.log(JSON.stringify(a) + " and " + JSON.stringify(b) + ": " + result);
  return result;
}

class DistanceHeap {
  constructor() {
    this.heap = new MinHeap(nodeAndDistanceLess);
  }

  isEmpty() {
    return this.heap.isEmpty();
  }

  removeShortestDistanceNode() {
    return this.heap.remove();
  }

  addNode(nodeAndDistance) {
    this.heap.insert(nodeAndDistance);
  }

  checkIntegrity() {
    this.heap.checkIntegrity();
  }

  toString() {
    return JSON.stringify(this.heap.heap);
  }
}

// Preserving this class for comparison/debugging
class SimpleDistanceHeap {
  constructor() {
    this.heap = new Map();
  }

  isEmpty() {
    return this.heap.size == 0;
  }

  removeShortestDistanceNode() {
    let shortestId = null;
    let shortestDistance = Number.POSITIVE_INFINITY;
    for (const [id, distance] of this.heap) {
      // actually this.heap.keys is a set of "interesting" vertices
      if (shortestId === null || distance < shortestDistance) {
        shortestId = id;
        shortestDistance = distance;
      }
    }
    if (shortestId == null) {
      return null;
    }
    this.heap.delete(shortestId);
    return new NodeAndDistance(shortestId, shortestDistance);
  }

  addNode(nodeAndDistance) {
    if (this.heap.has(nodeAndDistance.nodeId)) {
      throw "Assertion! " + nodeAndDistance.nodeId + " already exists!";
    }
    this.heap.set(nodeAndDistance.nodeId, nodeAndDistance.distance);
  }

  checkIntegrity() {
  }

  toString() {
    const result = [];
    for (const [id, distance] of this.heap) {
      result.push(new NodeAndDistance(id, distance));
    }
    return JSON.stringify(result);
  }
}

// ShortestPathTree is created on the base of an instance of the class Digraph; see digraph.js
export class ShortestPathTree {
  constructor(digraph) {
    if (!digraph)
      throw "No digraph passed: " + digraph;
    if (!digraph.getNode) {
      throw "No getNode method in digraph " + digraph + ": probably it is not a Digraph instance";
    }
    this.digraph = digraph;
    this.startNode = null;
    this.parentNodeIds = new Map();
    this.parentEdgeIds = new Map();
    // Note: parentEdgeIds is a map nodeId => parentEdgeID, not edgeId => parentEdgeId!
    // We have no any guarantee that edge IDs are different, they are additional information
    // and do not affect the algorithm.
    this.distances = new Map();
    this.numberOfNodes = digraph.getNumberOfNodes();
  }

  build(startNodeId) {
    const startNode = this.digraph.getNode(startNodeId);
    if (!startNode) {
      throw "No start node '" + startNodeId + "'";
    }
    this.startNode = startNode;
    this.distances = new Map();
    // - unlike distancesHeap, this is both a temporary memory AND the result of algorithm;
    // in other language like C/Java in would be an array, not map
    this.parentNodeIds = new Map();
    this.parentEdgeIds = new Map();
    const distancesHeap = _USE_MIN_HEAP ? new DistanceHeap() : new SimpleDistanceHeap();
    const visited = new Set();
    let counter = 0;
    distancesHeap.addNode(new NodeAndDistance(startNodeId, 0, counter++));

    while (!distancesHeap.isEmpty()) {
      const nodeAndDistance = distancesHeap.removeShortestDistanceNode();
//            console.log("!!! --> " + nodeAndDistance.nodeId);
//            distancesHeap.checkIntegrity(); // - uncomment this to test/debug MinHeap
      const nodeId = nodeAndDistance.nodeId;
      const distance = nodeAndDistance.distance;
      const nodeWithChildren = this.digraph.getNode(nodeId);
      for (let k = 0; k < nodeWithChildren.numberOfEdges; k++) {
        const childId = nodeWithChildren.getNeighbourId(k);
        if (visited.has(childId)) {
          continue;
        }
        const edgeId = nodeWithChildren.getEdgeId(k);
        const childWeight = nodeWithChildren.getWeight(k);
        const childDistance = this.distances.get(childId);
        const newDistance = distance + childWeight;
        if (childDistance == null || childDistance > newDistance) {
//                    console.log("!!! " + childId + " := " + newDistance + ", from " + nodeId + ", " + counter);
          this.distances.set(childId, newDistance);
          distancesHeap.addNode(new NodeAndDistance(childId, newDistance, counter++));
          this.parentNodeIds.set(childId, nodeId);
          this.parentEdgeIds.set(childId, edgeId);
        }
      }
      this.distances.set(nodeId, distance);
      visited.add(nodeId);
    }
  }

  getDistance(endNodeId) {
    return this.distances.get(endNodeId);
  }

  getShortestPath(endNodeId, resultSegmentsArray, resultNodesArray) {
    const endNode = this.digraph.getNode(endNodeId);
    resultSegmentsArray.length = 0;
    resultNodesArray.length = 0;
    if (!endNode) {
      return false;
      // - it is more simple in usage than throwing exception
    }
    let parentNodeId = this.parentNodeIds.get(endNodeId);
    let parentEdgeId = this.parentEdgeIds.get(endNodeId);
    if (parentNodeId == null) {
      return false;
    }
    resultNodesArray.push(endNodeId);
    while (parentNodeId != null) {
      resultSegmentsArray.push(parentEdgeId);
      resultNodesArray.push(parentNodeId);
      parentEdgeId = this.parentEdgeIds.get(parentNodeId);
      // - warning: must be BEFORE the next operator (changing parentNodeId)
      parentNodeId = this.parentNodeIds.get(parentNodeId);
    }
    resultSegmentsArray.reverse();
    resultNodesArray.reverse();
    return true;
  }

  getShortestPathInformation(endNodeId) {
    const pathSegments = [];
    const pathNodes = [];
    const feasible = this.getShortestPath(endNodeId, pathSegments, pathNodes);
    return feasible ?
      new PathInformation(this.startNode.id, endNodeId, pathSegments, pathNodes, this.getDistance(endNodeId)) :
      new PathInformation(this.startNode.id, endNodeId);
  }

  getAllShortestPathMap() {
    const results = new Map();
    for (const endNodeId of this.digraph.getAllNodeIds()) {
      const pathInformation = this.getShortestPathInformation(endNodeId);
      if (pathInformation.feasible) {
        results.set(endNodeId, pathInformation);
      }
    }
    return results;
  }
}

export class PathInformation {
  constructor(startId, endId, pathSegments, pathNodes, distance) {
    this.distance = distance;
    // - we assign it first to make this attribute the first in JSON
    this.startId = startId;
    this.endId = endId;
    if (pathSegments != null) {
      this.segments = pathSegments;
      this.nodes = pathNodes;
    }
    this.feasible = pathSegments != null;
  }

  briefClone() {
    return new PathInformation(this.startId, this.endId, null, null, this.distance);
  }
}

