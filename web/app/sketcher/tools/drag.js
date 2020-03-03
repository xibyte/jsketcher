import {Tool} from './tool'
import {optim} from '../../math/optim'
import * as math from '../../math/math'

export class DragTool extends Tool {
  
  constructor(obj, viewer) {
    super('drag', viewer);
    this.obj = obj;
    this._point = {x: 0, y: 0};
    this.origin = {x: 0, y: 0};
    this.solver = null;
  }
  
  mousemove(e) {
    var x = this._point.x;
    var y = this._point.y;
    this.viewer.screenToModel2(e.offsetX, e.offsetY, this._point);
    var dx = this._point.x - x;
    var dy = this._point.y - y;
    // for (var i = 0; i < this.lockedShifts.length; i += 2) {
    //   this.lockedValues[i] = this._point.x - this.lockedShifts[i];
    //   this.lockedValues[i + 1] = this._point.y - this.lockedShifts[i + 1];
    // }

    this.obj.translate(dx, dy);
    // this.viewer.parametricManager.setConstantsFromGeometry(this.obj);
    if (!Tool.dumbMode(e)) {
      this.viewer.parametricManager.prepare();
      this.viewer.parametricManager.solve(true);
    }
    this.viewer.refresh();
  }

  mousedown(e) {
    this.origin.x = e.offsetX;
    this.origin.y = e.offsetY;
    this.viewer.screenToModel2(e.offsetX, e.offsetY, this._point);

    this.viewer.parametricManager.prepare();

  }

  mouseup(e) {
    this.viewer.parametricManager.solve(false);
    this.viewer.refresh();
    this.viewer.toolManager.releaseControl();
    var traveled = math.distance(this.origin.x, this.origin.y, e.offsetX, e.offsetY);
    if (traveled >= 10) {
      this.viewer.historyManager.lightCheckpoint(10);
    }
    //this.animateSolution();
  }

  mousewheel(e) {
  }

  solveRequest(rough) {
    var paramsToUpdate = [];
    this.viewer.accept(function (obj) {
      if (obj.aux !== true) {
        if (obj.recoverIfNecessary()){
          obj.collectParams(paramsToUpdate);
        }
      }
      return true;
    });

    if (paramsToUpdate.length != 0) {
      for (var i = 0; i < paramsToUpdate.length; i++) {
        this.solver.updateParameter(paramsToUpdate[i]);
      }
      this.solver.solve(rough, 1);
    }
  }

  getParamsToLock() {
    var params = [];
    this.obj.accept(function (obj) {
      if (obj._class === 'TCAD.TWO.EndPoint' && !obj.fullyConstrained) {
        params.push(obj._x);
        params.push(obj._y);
      }
      return true;
    });
    return params;
  }

  prepareSolver(extraConstraints) {
    var locked = this.getParamsToLock();
    this.lockedShifts = [];
    this.lockedValues = [];
    for (var i = 0; i < locked.length; i += 2) {
      this.lockedShifts[i] = this._point.x - locked[i].get();
      this.lockedShifts[i + 1] = this._point.y - locked[i + 1].get();
    }
    this.solver = this.viewer.parametricManager.prepare(locked, extraConstraints);
    //this.enableRecording();
  }

  enableRecording() {
    var solver = this.solver;
    DragTool.snapshots = [];
    optim.DEBUG_HANDLER = () => {
      DragTool.snapshots.push([]);
      for (var i = 0; i < solver.solvers.length; i++) {
        var sys = solver.solvers[i].system;
        DragTool.snapshots[i].push(sys.params.map(function (p) {
          return p.get()
        }))
      }
    }
  }

  animateSolution() {
    if (DragTool.snapshots.length === 0) return;
    var stepNum = 0;
    var scope = this;
    var then = Date.now();
    var speed = 500;

    function step() {
      var now = Date.now();
      var elapsed = now - then;

      if (elapsed > speed) {
        for (var i = 0; i < scope.solver.solvers.length; i++) {
          var sys = scope.solver.solvers[i].system;
          if (stepNum >= DragTool.snapshots[i].length) continue;
          var values = DragTool.snapshots[i][stepNum];
          for (var k = 0; k < values.length; k++) {
            sys.params[k]._backingParam.set(values[k]);
          }
        }
        stepNum++;

        then = now;
        scope.viewer.repaint();
      }

      if (DragTool.snapshots.length != 0 && stepNum < DragTool.snapshots[0].length) {
        window.requestAnimationFrame(step);
      }
    }

    window.requestAnimationFrame(step);
  }
}

DragTool.snapshots = [];
