
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

export default (new BRepDebug()); 