import {Tool} from './tool'
import {Graph} from '../../math/graph'
import {Styles} from '../styles'

export class LoopPickTool extends Tool {

  constructor(name, viewer) {
    super(name, viewer);
    this.loops = new Map();
    this.marked = new Set();
    this.pickedLoop = null;
  }

  restart() {
    this.sendHint('pick a polygon');
    this.reindexLoops();
    this.marked.clear();
    this.pickedLoop = null;
  };

  cleanup() {
    this.clearMarked();
 }

  clearMarked() {
    for (let obj of this.marked) {
      obj.marked = null;
    }
    this.marked.clear();
  }

  mark(obj) {
    if (!this.marked.has(obj)) {
      obj.marked = Styles.SNAP;
      this.marked.add(obj);
    }
  }

  otherEnd(point) {
    if (point.parent.a.id == point.id) {
      return point.parent.b;
    } else {
      return point.parent.a;
    }
  }

  reindexLoops() {
    this.loops.clear();
    const points = [];
    this.viewer.accept((obj) => {
      if (obj._class == 'TCAD.TWO.EndPoint' && obj.parent && obj.parent.a && obj.parent.b) {
        points.push(obj);
      }
      return true;
    });
    const graph = {

      connections : (p) => {
        const conns = [this.otherEnd(p)];
        p.linked.forEach(l => conns.push(this.otherEnd(l)));
        return conns;
      },

      at : function(index) {
        return points[index];
      },

      size : function() {
        return points.length;
      }
    };
    const loops = Graph.findAllLoops(graph, (p) => p.id, (a, b) => a.id == b.id);
    for (let loop of loops) {
      for (let point of loop) {
        this.loops.set(point, loop);
      }
    }
  }

  mousemove(e) {
    this.clearMarked();
    this.pickedLoop = null;
    const p = this.viewer.screenToModel(e);
    this.pickedLoop = this.pickLoop(p);
    if (this.pickedLoop != null) {
      for (let p of this.pickedLoop) {
        this.mark(p.parent);
      }
    }
    this.viewer.refresh();
  };

  pickLoop(p) {
    const pickResult = this.viewer.search(p.x, p.y, 20 / this.viewer.scale, true, false, []);
    for (let obj of pickResult) {
      for (let point of [obj.a, obj.b]) {
        const loop = this.loops.get(point);
        if (loop) {
          return loop;
        }
      }
    }
    return null;
  }

  mousedown(e) {
    if (this.pickedLoop == null) {
      this.viewer.toolManager.releaseControl();
      this.viewer.toolManager.tool.mousedown(e);
    } else {
      this.onMousedown(e);
    }
  };

  onMousedown(e) {};

}
