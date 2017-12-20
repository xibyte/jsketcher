
class BRepDebug {

  constructor() {
    this.booleanSessions = [];
  }

  startBooleanSession(a, b, type) {
    this.currentBooleanSession = new BooleanSession(a, b, type)
    this.booleanSessions.push(this.currentBooleanSession);
  }


}

class BooleanSession {

  constructor(a, b, type) {
    this.id = ID_COUNTER ++;
    this.inputOperandA = a;
    this.inputOperandB = b;
  }

  setWorkingOperands(a, b) {
    this.workingOperandA = a;
    this.workingOperandB = b;
  }

  setResult(result) {
    this.result = result;
  }

}

let ID_COUNTER = 1;

export default (new BRepDebug()); 