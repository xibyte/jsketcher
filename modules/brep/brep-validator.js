export class BREPValidator {
  
  constructor() {
    this.errors = [];
  }
  
  validateShell(shell) {
    for (const face of shell.faces) {
      if (face.shell !== shell) {
        this.addError('FACE_REFERS_TO_WRONG_SHELL', "face refers to a shell it doesn't belong to", {face, shell});
      }
      this.validateFace(face);
    }
  }

  validateFace(face) {
    for (const loop of [face.outerLoop, ...face.innerLoops]) {
      if (face !== loop.face) {
        this.addError('LOOP_REFERS_TO_WRONG_FACE', 'loop refers to different face it belongs to', {loop, face});
      }
      this.validateLoop(loop);
    } 
  }

  validateLoop(loop) {
    const halfEdges = loop.halfEdges;
    const n = halfEdges.length;
    if (n === 0) {
      return;
    }

    for (let i = 0; i < n; i ++) {
      const j = (i + 1) % n;
      const curr = halfEdges[i];
      const next = halfEdges[j];
      if (curr.loop !== loop) {
        this.addError('HALF_EDGE_REFERS_TO_WRONG_LOOP', 'half edge refers to different loop it belongs to', {loop, he:curr});
      }
      if (curr.vertexB !== next.vertexA) {
        this.addError('VERTICES_OF_HALF_EDGE_NOT_CONNECTED', 'starting point of the following half edge should identically the same as ending of a half edge', {curr, next});
      }
      if (curr.next !== next) {
        this.addError('HALF_EDGE_NEXT_POINTER_INCORRECT', "half edge's next pointer doesn't refer to real next half edge", {curr, next});
      }
      if (next.prev !== curr) {
        this.addError('HALF_EDGE_PREV_POINTER_INCORRECT', "half edge's prev pointer doesn't refer to prior half edge", {next, curr});
      }
      if (!curr.edge) {
        this.addError('EDGE_FOR_HALF_EDGE_NOT_SET', "half edge doesn't refer to an edge", {he:curr});
      } else {
        const twin = curr.twin();
        if (curr.edge !== twin.edge) {
          this.addError('EDGE_OF_TWIN_DIFFERENT', "edge of twin doesn't match to the half edge's edge", {he:curr, twin});
        }
        if (twin.vertexB !== curr.vertexA) {
          this.addError('TWIN_START_VERTEX_INCORRECT', "a twin has incorrect start vertex, should be identical to the end vertex of the half edge", {he:curr, twin});
        }
        if (twin.vertexA !== curr.vertexB) {
          this.addError('TWIN_END_VERTEX_INCORRECT', "a twin has incorrect end vertex, should be identical to the start vertex of the half edge", {he:curr, twin});
        }
      }
    }
  }

  addError(code, message, validationError) {
    Object.assign(validationError, {code, message});
    this.errors.push(validationError);
  }  
}

BREPValidator.validateToConsole = function(shell) {
  const brepValidator = new BREPValidator();

  brepValidator.validateShell(shell);
  for (const brepError of brepValidator.errors) {
    console.warn(brepError.message);
  }
  if (brepValidator.errors.length === 0) {
    console.log('BREP is Valid.');
  }
};

BREPValidator.validate = function(shell) {
  const validator = new BREPValidator();
  validator.validateShell(shell);
  return validator.errors;
};
