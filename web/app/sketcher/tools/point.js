import {EndPoint} from '../viewer2d'
import {Tool} from './tool'

export class AddPointTool extends Tool{
  
  constructor(viewer) {
    super('point', viewer);
  }
  
  mouseup(e) {
    this.viewer.historyManager.checkpoint();
    var a = this.viewer.screenToModel(e);
    var p = new EndPoint(a.x, a.y);
    var layer = this.viewer.activeLayer;
    layer.objects.push(p);
    p.layer = layer;
    this.viewer.refresh();
  };
}
