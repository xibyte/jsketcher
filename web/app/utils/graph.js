import {HashTable} from './hashmap'

/** @constructor */
function Graph(data) {

  this.connections = function(e) {
    return data[e];
  };

  this.at = function(index) {
    return index;
  };

  this.size = function() {
    return data.length;
  };
}

Graph.findAllLoops = function(graph, hashCode, equals) {

  let loops = [];
  const visited = new HashTable(hashCode, equals);
  function step(vertex, comesFrom, path) {
    let i;
    visited.put(vertex, true);
    for (i = path.length - 1; i >= 0; --i) {
      if (equals(vertex, path[i])) {
        loops.push(path.slice(i));
        return;
      }
    }

    const next = graph.connections(vertex);

    path.push(vertex);
    let needClone = false;

    for (i = 0; i < next.length; i++) {
      const v = next[i];
      if (equals(v, comesFrom)) {
        continue;
      }

      const p = needClone ? path.slice(0) : path;
      needClone = true;
      step(v, vertex, p);
    }
    path.pop();
  }

  for (i = 0; i < graph.size(); i++) {
    const vertex = graph.at(i);
    if (visited.get(vertex) !== true) {
      step(vertex, -1, []);
    }
  }

  //filter duplicates

  function sameLoop(a, b) {
    const first = a[0];
    let bShift;
    for (bShift = 0; bShift < a.length; bShift++) {
      if (equals(b[bShift], first)) {
        break;
      }
    }
    if (bShift == a.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      const bUp = (bShift + i) % a.length;
      let bDown = bShift - i;
      if (bDown < 0) {
        bDown = a.length + bDown;
      }
//      console.log("up: " + bUp + "; down: " + bDown);
      const curr = a[i];
      if ( !equals(curr, b[bUp]) && !equals(curr, b[bDown]) ) {
        return false;
      }
    }
    return true;
  }

  let i, duplicates = 0;
  for (i = 0; i < loops.length; i++) {
    const a = loops[i];
    if (a == null) continue;
    for (let j = i + 1; j < loops.length; j++) {
      const b = loops[j];
      if (b == null || a.length !== b.length) {
        continue;
      }
      if (sameLoop(a, b)) {
        loops[j] = null;
        ++ duplicates;
      }
    }
  }
  if (duplicates != 0) {
    const filtered = [];
    for (i = 0; i < loops.length; i++) {
      if (loops[i] != null) filtered.push(loops[i]);
    }
    loops = filtered;
  }

  return loops;
};


const test = function() {
  const data = [
    [],
    [2],
    [1, 3, 9],
    [2, 4],
    [3, 9, 5, 8],
    [4, 6],
    [5, 8, 7],
    [6],
    [4, 6],
    [2, 4]
  ];

  const graph = new Graph(data);
  console.log(Graph.findAllLoops(graph));
};

const test0 = function() {
  const data = [
    [3, 1],
    [0, 2, 8],
    [1, 3, 7, 5],
    [0, 2, 4],
    [3, 5],
    [4, 2, 6],
    [5, 7],
    [2, 6, 8],
    [1, 7]
  ];

  const graph = new Graph(data);
  console.log(Graph.findAllLoops(graph));
};

export {Graph}