import {EndPoint} from '../viewer2d'
import {Tool} from './tool'

export class AddPointTool extends Tool {
  
  constructor(viewer) {
    super('point', viewer);
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
    layer.objects.push(p);
    p.layer = layer;
    this.pointPicked(input.x, input.y);
    this.viewer.refresh();
    this.restart();
  }
}
