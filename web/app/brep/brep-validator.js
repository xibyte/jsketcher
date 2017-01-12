import Vector from '../math/vector'
import * as math from '../math/math'

export class BREPValidator {
  
  constructor() {
    this.errors = [];
  }
  
  validateShell(shell) {
    for (let face of shell.faces) {
      this.validateFace(face);
    }
  }

  validateFace(face) {
    if (face !== face.outerLoop.face) {
      this.addError(new LoopRefersToWrongFace(face.outerLoop, face));
    }
    this.validateLoop(face.outerLoop);
  }

  validateLoop(loop) {
    const halfEdges = loop.halfEdges;
    const n = halfEdges.length;
    if (n == 0) {
      return;
    }

    for (let i = 0; i < n; i ++) {
      const j = (i + 1) % n;
      const curr = halfEdges[i];
      const next = halfEdges[j];
      if (curr.loop !== loop) {
        this.addError(new HalfEdgeRefersToWrongLoop(loop, curr));
      }
      if (curr.vertexB !== next.vertexA) {
        this.addError(new VerticesOfHalfEdgeArentConnected(curr, next));
      }
      if (curr.next != next) {
        this.addError(new HalfEdgeNextPointerIncorrect(curr, next));
      }
      if (next.prev != curr) {
        this.addError(new HalfEdgePrevPointerIncorrect(next, curr));
      }
      if (!curr.edge) {
        this.addError(new EdgeForHalfEdgeIsntSet(curr));
      } else {
        const twin = curr.twin();
        if (curr.edge !== twin.edge) {
          this.addError(new EdgeOfTwinDifferent(curr, twin));
        }
        if (twin.vertexB != curr.vertexA) {
          this.addError(new TwinStartVertexIncorrect(curr, twin));
        }
        if (twin.vertexA != curr.vertexB) {
          this.addError(new TwinEndVertexIncorrect(curr, twin));
        }
      }
    }
  }

  addError(validationError) {
    this.errors.push(validationError);
  }  
}

BREPValidator.validateToConsole = function(shell) {
  const brepValidator = new BREPValidator();

  brepValidator.validateShell(shell);
  for (let brepError of brepValidator.errors) {
    console.warn(brepError.message());
  }
  if (brepValidator.errors.length == 0) {
    console.log('BREP is Valid.');
  }
};

class VerticesOfHalfEdgeArentConnected {
  constructor(loop, halfEdge1, halfEdge2) {
    this.loop = loop;
    this.halfEdge1 = halfEdge1;
    this.halfEdge2 = halfEdge2;
  }
  
  message() {
    return 'starting point of the following half edge should identically the same as ending of a half edge';
  }
}

class HalfEdgeRefersToWrongLoop {
  constructor(loop, face) {
    this.loop = loop;
    this.face = face;
  }

  message() {
    return 'half edge refers to different loop it belongs to';
  }
}

class LoopRefersToWrongFace {
  constructor(loop, halfEdge) {
    this.loop = loop;
    this.halfEdge = halfEdge;
  }

  message() {
    return 'loop refers to different face it belongs to';
  }
}

class HalfEdgeNextPointerIncorrect {
  constructor(halfEdge, nextHalfEdge) {
    this.halfEdge = halfEdge;
    this.nextHalfEdge = nextHalfEdge;
  }

  message() {
    return "half edge's next pointer doesn't refer to real next half edge";
  }
}

class HalfEdgePrevPointerIncorrect {
  constructor(halfEdge, prevHalfEdge) {
    this.halfEdge = halfEdge;
    this.prevHalfEdge = prevHalfEdge;
  }

  message() {
    return "half edge's prev pointer doesn't refer to prior half edge";
  }
}

class TwinStartVertexIncorrect {
  constructor(halfEdge, twin) {
    this.halfEdge = halfEdge;
    this.twin = twin;
  }

  message() {
    return "a twin has incorrect start vertex, should be identical to the end vertex of the half edge";
  }
}

class TwinEndVertexIncorrect {
  constructor(halfEdge, twin) {
    this.halfEdge = halfEdge;
    this.twin = twin;
  }

  message() {
    return "a twin has incorrect end vertex, should be identical to the start vertex of the half edge";
  }
}

class EdgeForHalfEdgeIsntSet {
  constructor(halfEdge) {
    this.halfEdge = halfEdge;
  }

  message() {
    return "half edge doesn't refer to an edge";
  }
}

class EdgeOfTwinDifferent {
  constructor(halfEdge, twin) {
    this.halfEdge = halfEdge;
    this.twin = twin;
  }

  message() {
    return "edge of twin doesn't match to the half edge's edge";
  }
}
