import {Tool} from './tool'
import {Graph} from '../../utils/graph'
import {Styles} from '../styles'
import {DEFAULT_SEARCH_BUFFER} from "../viewer2d";

export class LoopPickTool extends Tool {

  constructor(name, viewer) {
    super(name, viewer);
    this.loops = new Map();
    this.marked = new Set();
    this.pickedLoop = null;
    this.pointToObject = new Map();
  }  

  restart() {
    this.sendHint('pick a polygon');
    this.reindexLoops();
    this.marked.clear();
    this.pointToObject.clear();
    this.pickedLoop = null;
  };

  cleanup() {
    this.clearMarked();
 }

  clearMarked() {
    this.viewer.withdrawAll('tool');
  }

  mark(obj) {
    this.viewer.capture('tool', obj);
  }

  otherEnd(point) {
    if (point.parent.a.id === point.id) {
      return point.parent.b;
    } else {
      return point.parent.a;
    }
  }

  reindexLoops() {
    this.loops.clear();
    const points = [];
    this.viewer.accept((obj) => {
      if (obj.TYPE === 'Point' && obj.parent &&
          obj.parent.a && obj.parent.b && (obj.parent.a === obj || obj.parent.b === obj)) {
        points.push(obj);
      }
      return true;
    });
    const graph = {

      connections : (p) => {
        const conns = []
        p.visitLinked(l => conns.push(l));
        conns.push(this.otherEnd(p));
        return conns;
      },

      at : function(index) {
        return points[index];
      },

      size : function() {
        return points.length;
      }
    };
    const loopPoints = Graph.findAllLoops(graph, (p) => p.id, (a, b) => a.id === b.id);
    const loops = loopPoints.map(l => this.cleanLoop(l));
    for (let loop of loops) {
      for (let point of loop.points) {
        this.loops.set(point, loop);
      }
    }
  }

  cleanLoop(loop) {
    const points = [];
    const edges = [];
    for (var i = 0; i < loop.length; i++) {
      const a = loop[i];
      const b = loop[(i + 1) % loop.length];
      if (a.parent == b.parent) {
        points.push(a);
        edges.push(b.parent);
      }
    }
    return {points, edges};
  }
  
  mousemove(e) {
    this.clearMarked();
    this.pickedLoop = null;
    const p = this.viewer.screenToModel(e);
    this.pickedLoop = this.pickLoop(p);
    if (this.pickedLoop != null) {
      for (let obj of this.pickedLoop.edges) {
        this.mark(obj);
      }
    }
    this.viewer.refresh();
  };

  pickLoop(p) {
    const pickResult = this.viewer.search(p.x, p.y, DEFAULT_SEARCH_BUFFER, true, false, []);
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

function getEdgeFor(a, b) {
  if (isEdgeFor(a.parent, a, b)) {
    return a.parent
  } else if (isEdgeFor(b.parent, a, b)) {
    return b.parent;
  } else {
    return null;
  }
}

function isEdgeFor(obj, a, b) {
  return (obj.a.id == a.id && obj.b.id == b.id) || (obj.a.id == b.id && obj.b.id == b.id)
}
