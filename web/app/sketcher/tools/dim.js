import {
  AngleBetweenDimension,
  DiameterDimension,
  findCenter,
  HDimension, LinearDimension,
  VDimension,
} from '../shapes/dim'
import Vector from 'math/vector';
import {EndPoint} from '../shapes/point'
import {Tool} from './tool'
import {DragTool} from "./drag";
import {isInstanceOf} from "../actions/matchUtils";
import {Segment} from "../shapes/segment";
import {DEFAULT_SEARCH_BUFFER} from "../viewer2d";
import {_negate, cross2d} from "math/vec";
import {distance} from "math/distance";

export class AddDimTool extends Tool {

  constructor(name, viewer, layer, dimCreation) {
    super(name, viewer);
    this.layer = layer;
    this.dim = null;
    this._v = new Vector(0, 0, 0);
    this.dimCreation = dimCreation;
  }

  mousemove(e) {
    const p = this.viewer.screenToModel(e);
    this.viewer.snap(p.x, p.y, []);
    if (this.dim != null) {
      this.dim.b.x = p.x;
      this.dim.b.y = p.y;
    }
    this.viewer.refresh();
  }

  mouseup(e) {

    if (this.viewer.snapped == null) {
      if (this.dim === null) {
        const result = this.viewer.pick(e);
        if (result.length >= 0) {
          const segment = result.find(e => isInstanceOf(e, Segment));
          if (segment) {
            this.dim = this.dimCreation(segment.a, segment.b);
            this.dim.offset = 0;
            this.layer.add(this.dim);
            this.viewer.toolManager.switchTool(new DragTool(this.dim, this.viewer));
            this.viewer.toolManager.tool.mousedown(e);
            this.viewer.refresh();
          }
        }
      }
      return;
    }

    const p = this.viewer.snapped;
    this.viewer.cleanSnap();

    if (this.dim == null) {
      this.viewer.historyManager.checkpoint();
      this.dim = this.dimCreation(p, new EndPoint(p.x, p.y));
      this.dim.offset = 0;
      this.layer.add(this.dim);
      this.viewer.refresh();
    } else {
      this.dim.b = p;
      this.viewer.toolManager.switchTool(new DragTool(this.dim, this.viewer));
      this.viewer.toolManager.tool.mousedown(e);
      this.viewer.refresh();
    }
  }
}

export class AddFreeDimTool extends AddDimTool {
  constructor(viewer, layer) {
    super('free dimension', viewer, layer, (a, b) => new LinearDimension(a, b));
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
    const p = this.viewer.screenToModel(e);
    const objects = this.viewer.search(p.x, p.y, DEFAULT_SEARCH_BUFFER, true, false, []).filter(function (o) {
      return o.TYPE === 'Circle' || o.TYPE === 'Arc';
    });

    if (objects.length !== 0) {
      this.dim.obj = objects[0];
      this.viewer.capture('tool', [this.dim.obj], true);
    } else {
      this.dim.obj = null;
      this.viewer.withdrawAll('tool');
    }
    if (this.dim.obj !== null) {
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
    this.viewer.withdrawAll('tool');
    this.viewer.refresh();
    this.viewer.toolManager.releaseControl();
  }
}

export class AddAngleTool extends Tool {

  constructor(name, viewer, layer, dimCreation) {
    super(name, viewer);
    this.layer = layer;
    this.a = null;
    this.dim = null;
    this.dimCreation = dimCreation;
  }

  mousemove(e) {
    const p = this.viewer.screenToModel(e);

    const result = this.viewer.search(p.x, p.y, DEFAULT_SEARCH_BUFFER, true, false, []).filter(o => o.TYPE === 'Segment');
    const [segment] = result;

    if (this.dim) {
      let center;
      if (!this.dim.isAnnotation) {
        let configuration;
        [center, configuration] = this.classify(p.x, p.y);
        if (configuration) {
          this.dim.configuration = configuration;
        }
      } else {
        const line1 = this.dim.a, line2 = this.dim.b;
        const v1 = [line1.ny, - line1.nx];
        const v2 = [line2.ny, - line2.nx];
        center = findCenter(line1.a, line1.b, line2.a, line2.b, v1[0], v1[1], v2[0], v2[1]);
      }
      if (!center) {
        center = segment.a;
      }
      const [cx, cy] = center;
      this.dim.offset = distance(cx, cy, p.x, p.y);

    } else {
      if (segment) {
        this.viewer.capture('tool', [segment], true);
      } else {
        this.viewer.withdrawAll('tool');
      }
    }


    this.viewer.refresh();
  }

  mouseup(e) {

    const p = this.viewer.screenToModel(e);

    const [segment] = this.viewer.captured.tool;
    this.viewer.withdrawAll('tool');

    if (this.a === null) {
      if (!segment) {
        this.viewer.toolManager.releaseControl();
        this.viewer.refresh();
      }
      this.a = segment;
    } else if (this.dim == null) {
      if (!segment) {
        this.viewer.toolManager.releaseControl();
        this.viewer.refresh();
      }

      this.dim = this.dimCreation(this.a, segment);
      let [center, configuration] = this.classify(p.x, p.y);
      if (configuration) {
        this.dim.configuration = configuration;
      }
      if (!center) {
        center = segment.a;
      }
      const [cx, cy] = center;
      this.dim.offset = distance(cx, cy, p.x, p.y);
      this.layer.add(this.dim);
      this.viewer.refresh();
    } else {
      this.viewer.toolManager.releaseControl();
      this.viewer.refresh();
    }
  }

  classify(px, py) {

    const line1 = this.dim.a, line2 = this.dim.b;

    const v1 = [line1.ny, - line1.nx];
    const v2 = [line2.ny, - line2.nx];

    const isec = findCenter(line1.a, line1.b, line2.a, line2.b, v1[0], v1[1], v2[0], v2[1]);
    if (!isec) {
      return [];
    }

    const [cx, cy] = isec;
    const v = [px - cx, py - cy];

    const insideSector = (v, v1, v2) => cross2d(v1, v) > 0  && cross2d(v2, v) < 0;

    if (insideSector(v, v1, v2)) {
      return [isec, [line1.a, line1.b, line2.a, line2.b]];
    }

    if (insideSector(v, v2, _negate(v1))) {
      return [isec, [line2.a, line2.b, line1.b, line1.a]];
    }
    _negate(v1);

    if (insideSector(v, _negate(v1), _negate(v2))) {
      return [isec, [line1.b, line1.a, line2.b, line2.a]];
    }
    _negate(v1);
    _negate(v2);

    if (insideSector(v, _negate(v2), v1)) {
      return [isec, [line2.b, line2.a, line1.a, line1.b]];
    }


    return [isec];
  }

}

export class AddAngleBetweenDimTool extends AddAngleTool {
  constructor(viewer, layer) {
    super('angle between dimension', viewer, layer, (a, b) => new AngleBetweenDimension(a, b));
  }
}
