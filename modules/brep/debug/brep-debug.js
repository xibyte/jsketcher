
class BRepDebug {

  constructor() {
    this.booleanSessions = [];
  }

  startBooleanSession(a, b, type) {
    this.currentBooleanSession = new BooleanSession(a, b, type)
    this.booleanSessions.push(this.currentBooleanSession);
  }

  setBooleanWorkingOperands(a, b) {
    this.currentBooleanSession.workingOperandA = a;
    this.currentBooleanSession.workingOperandB = b;
  }

  setBooleanResult(result) {
    this.currentBooleanSession.result = result;
  }

  startBooleanLoopDetection(graph) {
    this.currentBooleanSession.loopDetection.push({
      id: this.currentBooleanSession.loopDetection.length + 1,
      steps: [],
      detectedLoops: [],
      graph: graph.graphEdges.slice()
    });
  }
  

  booleanLoopDetectionBeginLoop() {
    last(this.currentBooleanSession.loopDetection).steps.push({type: 'TRY_LOOP'});
  }

  booleanLoopDetectionStep(edge) {
    last(this.currentBooleanSession.loopDetection).steps.push({type: 'TRY_EDGE', edge});
  }
  
  booleanLoopDetectionSuccess(loop) {
    const ld = last(this.currentBooleanSession.loopDetection);
    ld.detectedLoops.push(loop);
    ld.steps.push({type: 'LOOP_FOUND'});
  }

  booleanLoopDetectionNextStep(candidates, winner) {
    last(this.currentBooleanSession.loopDetection).steps.push({type: 'NEXT_STEP_ANALYSIS', candidates, winner});
  }

  transferEdge(edge, face, chosenEdge) {
    this.currentBooleanSession.transferedEdges.push({edge, face, chosenEdge});
  }

  faceFilter(connectedToAffectedFaces, allFaces) {
    this.currentBooleanSession.faceFilter.connectedToAffectedFaces = connectedToAffectedFaces;
    this.currentBooleanSession.faceFilter.allFaces = allFaces;
  }

  setOverlappingFaces(groups) {
    this.currentBooleanSession.overlappingFacesGroups = groups;
  }

  booleanFaceIntersection(faceA, faceB, curve, nodes) {
    this.currentBooleanSession.faceIntersections.push({faceA, faceB, curve, nodes})
  }
  
  markEdge(id, edge, color) {
    this.currentBooleanSession.markedEdges.push({
      id, edge, color
    });
  }
}

class BooleanSession {

  constructor(a, b, type) {
    this.id = ID_COUNTER ++;
    this.type = type;
    this.inputOperandA = a;
    this.inputOperandB = b;
    this.loopDetection = [];
    this.transferedEdges = [];
    this.mergeFacesLoopDetection = [];
    this.currentLoopDetection = null;
    this.overlappingFacesGroups = [];
    this.markedEdges = [];
    this.faceIntersections = [];
    this.faceFilter = {
      connectedToAffectedFaces: null,
      allFaces: null,
    };
  }
}

function last(arr) {
  return arr[arr.length - 1];
}

let ID_COUNTER = 1;

export default (new BRepDebug()); 