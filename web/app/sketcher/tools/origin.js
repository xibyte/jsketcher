import {Tool} from './tool'

export class ReferencePointTool extends Tool {
  
  constructor(viewer) {
    super('origin', viewer);
  }
  
  restart() {
    this.sendSpecifyPointHint();
  }
  
  cleanup(e) {
    this.viewer.cleanSnap();
  }
  
  mousemove(e) {
    const p = this.viewer.screenToModel(e);
    this.viewer.snap(p.x, p.y, []);
    this.viewer.refresh();
  }
  
  mousedown(e) {
    const needSnap = this.viewer.snapped != null;
    const p = needSnap ? this.viewer.snapped : this.viewer.screenToModel(e);
    this.viewer.referencePoint.x = p.x;
    this.viewer.referencePoint.y = p.y;
    this.pointPicked(p.x, p.y);
    this.viewer.refresh();
    this.viewer.toolManager.releaseControl();
  }
  
  processCommand(command) {
    const referencePoint = this.viewer.referencePoint;
    const result = Tool.ParseVector(referencePoint, command);
    if(typeof result === 'string') {
      return result;
    }  
    referencePoint.x += result.x;
    referencePoint.y += result.y;
    this.viewer.refresh();
    this.viewer.toolManager.releaseControl();
  }
}


