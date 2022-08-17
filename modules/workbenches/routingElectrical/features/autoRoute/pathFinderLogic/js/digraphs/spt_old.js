// Created on the base of the project:
// https://github.com/noamsauerutley/shortest-path

// MIT License

// Copyright 2020 © Noam Sauer-Utley. https://www.noamsauerutley.com/

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.


class ShortestPathTree {
  constructor(graph) {
    if (!graph)
      throw "No graph passed: " + graph;
    this.graph = graph;
    this.startNode = null;
    this.parents = {};
    this.distances = {};
    this.numberOfNodes = Object.entries(graph).length;
  }

  build(startNode) {
    if (!this.graph[startNode])
      throw "No start node '" + startNode + "'";
    this.startNode = startNode;
    this.distances = {};
    this.distances = Object.assign(this.distances, this.graph[startNode]);

    this.parents = {};
    // track paths
    for (const child in this.graph[startNode]) {
      this.parents[child] = startNode;
    }

    // track nodes that have already been visited
    const visited = [];

    // find the nearest node
    let node = this.shortestDistanceNode(visited);

    // for that node
    while (node) {
      // find its distance from the start node & its child nodes
      const distance = this.distances[node];
      const children = this.graph[node];
      // for each of those child nodes
      for (const child in children) {
        // make sure each child node is not the start node
        if (String(child) === String(startNode)) {
          continue;
        }
        // save the distance from the start node to the child node
        const newdistance = distance + children[child];
        // if there's no recorded distance from the start node to the child node in the distances object
        // or if the recorded distance is shorter than the previously stored distance from the start node to the child node
        // save the distance to the object
        // record the path
        if (!this.distances[child] || this.distances[child] > newdistance) {
          this.distances[child] = newdistance;
          this.parents[child] = node;
        }
      }
      // move the node to the visited set
      visited.push(node);
      // move to the nearest neighbor node
      node = this.shortestDistanceNode(visited);
    }
  }

  getShortestPath(endNode) {
    if (!this.graph[endNode])
      throw "No end node '" + endNode + "'";
    let parent = this.parents[endNode];
    if (parent == null) {
      return null;
    }
    const shortestPath = [endNode];
    while (parent) {
      shortestPath.push(parent);
      parent = this.parents[parent];
    }
    shortestPath.reverse();
    return shortestPath;
  }

  // private
  shortestDistanceNode(visited) {
    let shortest = null;

    for (const node in this.distances) {
      const currentIsShortest =
        shortest === null || this.distances[node] < this.distances[shortest];
      if (currentIsShortest && !visited.includes(node)) {
        shortest = node;
      }
    }
    return shortest;
  }
}



