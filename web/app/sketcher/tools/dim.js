import {HDimension, VDimension, Dimension, DiameterDimension} from '../shapes/dim'
import Vector from '../../math/vector'
import {EndPoint} from '../shapes/point'
import {Tool} from './tool'

export class AddDimTool extends Tool {

  constructor(name, viewer, layer, dimCreation) {
    super(name, viewer);
    this.layer = layer;
    this.dim = null;
    this._v = new Vector(0, 0, 0);
    this.dimCreation = dimCreation;
  }

  mousemove(e) {
    var p = this.viewer.screenToModel(e);
    this.viewer.snap(p.x, p.y, []);
    if (this.dim != null) {
      this.dim.b.x = p.x;
      this.dim.b.y = p.y;
    }
    this.viewer.refresh();
  }

  mouseup(e) {

    if (e.button > 0 && this.dim != null) {
      this.dim.flip = !this.dim.flip;
      this.viewer.refresh();
      return;
    }

    if (this.viewer.snapped == null) {
      return;
    }

    const p = this.viewer.snapped;
    this.viewer.cleanSnap();

    if (this.dim == null) {
      this.viewer.historyManager.checkpoint();
      this.dim = this.dimCreation(p, new EndPoint(p.x, p.y));
      this.layer.objects.push(this.dim);
      this.viewer.refresh();
    } else {
      this.dim.b = p;
      this.viewer.toolManager.releaseControl();
      this.viewer.refresh();
    }
  }
}

export class AddFreeDimTool extends AddDimTool {
  constructor(viewer, layer) {
    super('free dimension', viewer, layer, (a, b) => new Dimension(a, b));
  }
}

export class AddHorizontalDimTool extends AddDimTool {
  constructor(viewer, layer) {
    super('horizontal dimension', viewer, layer, (a, b) => new HDimension(a, b));
  }
}

export class AddVerticalDimTool extends AddDimTool {
  constructor(viewer, layer) {
    super('vertical dimension', viewer, layer, (a, b) => new VDimension(a, b));
  }
}

export class AddCircleDimTool extends Tool {
  constructor(viewer, layer) {
    super('arc/circle dimension', viewer);
    this.layer = layer;
    this.dim = new DiameterDimension(null);
    this.viewer.add(this.dim, this.layer);
  }

  mousemove(e) {
    var p = this.viewer.screenToModel(e);
    var objects = this.viewer.search(p.x, p.y, 20 / this.viewer.scale, true, false, []).filter(function (o) {
      return o._class === 'TCAD.TWO.Circle' || o._class === 'TCAD.TWO.Arc';
    });

    if (objects.length != 0) {
      this.dim.obj = objects[0];
    } else {
      this.dim.obj = null;
    }
    if (this.dim.obj != null) {
      this.dim.angle = Math.atan2(p.y - this.dim.obj.c.y, p.x - this.dim.obj.c.x);
    }
    this.viewer.refresh();
  }

  mouseup(e) {
    if (this.dim.obj !== null) {
      this.viewer.historyManager.checkpoint();
    } else {
      this.viewer.remove(this.dim);
    }
    this.viewer.toolManager.releaseControl();
  }
}

