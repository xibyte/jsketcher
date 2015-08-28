

TCAD.graph = {};


TCAD.graph.finaAllLoops = function(graph) {

  var loops = [];
  var visited = {};
  function step(vertex, comesFrom, path) {
    var i;
    var vertexId = graph.id(vertex);
    visited[vertexId] = true;
    for (i = path.length - 1; i >= 0; --i) {
      if (vertexId === graph.id(path[i])) {
        loops.push(path.slice(i));
        return;
      }
    }
    
    var next = graph.connections(vertex);
    
    path.push(vertex);
    var needClone = false;
    
    VERTEX:
    for (i = 0; i < next.length; i++) {
      var v = next[i];
      var nextId = graph.id(v);
      if (nextId === comesFrom) {
        continue;
      }

//      //avoid duplicates
//      for (var li = loops.length - 1; li >= 0; --li) {
//        var loop = loops[li];
//        for (var j = 1; j < loop.length; j++) {
//          if (loop[j - 1] == nextId && loop[j] == vertexId) {
//            continue VERTEX;
//          }
//        }
//      }
      
      var p = needClone ? path.slice(0) : path;
      needClone = true;
      step(v, vertexId, p);  
    }
    path.pop();
  }

  for (var i = 0; i < graph.size(); i++) {
    var vertex = graph.at(i);
    if (visited[graph.id(vertex)] !== true) {
      step(vertex, -1, []);
    }
  }

  //filter duplicates

  function sameLoop(a, b, key) {
    var first = key(a[0]);
    for (var bShift = 0; bShift < a.length; bShift++) {
      if (key(b[bShift]) === first) {
        break;
      }
    }
    if (bShift == a.length) {
      return false;
    }
    for (var i = 0; i < a.length; i++) {
      var bUp = (bShift + i) % a.length;
      var bDown = bShift - i;
      if (bDown < 0) {
        bDown = a.length + bDown;
      }
//      console.log("up: " + bUp + "; down: " + bDown);
      var curr = key(a[i]);
      if (curr != key(b[bUp]) && curr != key(b[bDown]) ) {
        return false;
      }
    }
    return true;
  }

  var duplicates = 0;
  for (var i = 0; i < loops.length; i++) {
    var a = loops[i];
    if (a == null) continue;
    for (var j = i + 1; j < loops.length; j++) {
      var b = loops[j];
      if (b == null || a.length !== b.length) {
        continue;
      }
      if (sameLoop(a, b, graph.id)) {
        loops[j] = null;
        ++ duplicates;
      }
    }
  }
  if (duplicates != 0) {
    var filtered = [];
    for (var i = 0; i < loops.length; i++) {
      if (loops[i] != null) filtered.push(loops[i]);
    }
    loops = filtered;
  }

  return loops;
};

/** @constructor */
TCAD.graph.Graph = function(data) {

  this.id = function(e) {
    return e;
  };

  this.connections = function(e) {
    return data[e];
  };

  this.at = function(index) {
    return index;
  };

  this.size = function() {
    return data.length;
  };
};

TCAD.graph.test = function() {
  var data = [
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

  var graph = new TCAD.graph.Graph(data);
  console.log(TCAD.graph.finaAllLoops(graph));
};

TCAD.graph.test0 = function() {
  var data = [
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

  var graph = new TCAD.graph.Graph(data);
  console.log(TCAD.graph.finaAllLoops(graph));
};
