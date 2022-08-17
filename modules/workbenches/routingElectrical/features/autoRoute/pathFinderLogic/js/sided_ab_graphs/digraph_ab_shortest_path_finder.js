import {nodeToPoint, pointToNode} from "./digraph_ab_builder.js"
import {PathInformation, ShortestPathTree} from "../digraphs/spt.js"

export class DigraphABShortestPathFinder {
  constructor(digraph) {
    this.treeA = new ShortestPathTree(digraph);
    this.treeB = new ShortestPathTree(digraph);
    this.startPointId = null;
  }

  processPair(pointPair) {
    this.rebuild(pointPair.startPoint);
    pointPair.route = this.getShortestPathInformation(pointPair.endPoint);
  }

  rebuild(startPointId) {
    if (startPointId != this.startPointId) {
      this.build(startPointId);
    }
  }

  build(startPointId) {
    this.treeA.build(pointToNode(startPointId, "A"));
    this.treeB.build(pointToNode(startPointId, "B"));
    this.startPointId = startPointId;
  }

  // Rarely used
  getShortestPathInformationForBothSides(endPointId) {
    const result = [];
    addIfExists(result, this.treeA.getShortestPathInformation(pointToNode(endPointId, "A")));
    addIfExists(result, this.treeA.getShortestPathInformation(pointToNode(endPointId, "B")));
    addIfExists(result, this.treeB.getShortestPathInformation(pointToNode(endPointId, "A")));
    addIfExists(result, this.treeB.getShortestPathInformation(pointToNode(endPointId, "B")));
    return result;
  }

  getShortestPathInformation(endPointId, includePointsWhenNotFound) {
    const forBothSides = this.getShortestPathInformationForBothSides(endPointId);
    if (forBothSides.length == 0) {
      return includePointsWhenNotFound ?
        new PathInformation(this.startPointId, endPointId) :
        new PathInformation();
    }
    let result = forBothSides[0];
    for (let k = 1; k < forBothSides.length; k++) {
      if (forBothSides[k].distance < result.distance) {
        result = forBothSides[k];
      }
    }
    if (containsDuplicates(result.nodes)) {
      result.containsDuplicates = true;
    }
    return result;
  }
}

export function containsDuplicates(nodesArray) {
  const points = new Set();
  for (const node of nodesArray) {
    const p = nodeToPoint(node);
    if (points.has(p)) {
      return true;
    }
    points.add(p);
  }
  return false;
}

// private
function addIfExists(array, pathInformation) {
  if (pathInformation.feasible) {
    array.push(pathInformation);
  }
}

