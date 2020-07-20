import {EndPoint} from '../shapes/point'
import {Tool} from './tool'

export class AddPointTool extends Tool {
  
  constructor(viewer) {
    super('geom.point', viewer);
  }

  restart() {
    this.sendSpecifyPointHint();
  }

  mouseup(e) {
    const input = this.viewer.screenToModel(e);
    this.processPointInput(input);
  }

  processCommand(command) {
    const result = Tool.ParseVector(this.viewer.referencePoint, command);
    if(typeof result === 'string') {
      return result;
    }
    this.processPointInput(result);
  }

  processPointInput(input) {
    this.viewer.historyManager.checkpoint();
    const p = new EndPoint(input.x, input.y);
    const layer = this.viewer.activeLayer;
    layer.add(p);
    this.pointPicked(input.x, input.y);
    this.viewer.refresh();
    this.restart();
  }
}
