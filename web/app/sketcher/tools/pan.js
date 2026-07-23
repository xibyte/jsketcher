import {Tool} from './tool'
import {GetShapeEditTool} from './edit-tools-map'
import {isConstraintAnnotation} from "sketcher/constr/constraintAnnotation";
import {editConstraint} from "sketcher/actions/constraintActions";

export class BasePanTool extends Tool {

  constructor(viewer) {
    super('pan', viewer);
  }
  
  mousedown(e) {
    if (e.button === 0) {
      const picked = this.viewer.pick(e);
      let i;
      if (picked.length > 0) {
        let toSelect;
        if (e.shiftKey) {
          toSelect = picked[0];
          const ids = this.viewer.selected.map(function (s) {
            return s.id
          });
          for (i = 0; i < picked.length; i++) {
            if (ids.indexOf(picked[i].id) !== -1) {
              this.viewer.deselect(picked[i]);
            } else {
              toSelect = picked[i];
            }
          }
          this.viewer.select([toSelect], false);
          this.deselectOnUp = false;
        } else {
          toSelect = picked[0];
          if (this.viewer.selected.length === 1) {
            for (i = 0; i < picked.length - 1; i++) {
              if (picked[i].id === this.viewer.selected[0].id) {
                toSelect = picked[i + 1];
                break;
              }
            }
          }
          this.viewer.select([toSelect], true);
          if (!toSelect.readOnly) {
            const tool = GetShapeEditTool(this.viewer, toSelect, e.altKey);
            tool.mousedown(e);
            this.viewer.toolManager.switchTool(tool);
          }
        }
        this.viewer.refresh();
        return;
      }
    }
    this.startDragging(e);
  }

  dblclick() {
    const [obj] = this.viewer.selected;
    if (isConstraintAnnotation(obj)) {
      editConstraint(this.viewer.applicationContext, obj.constraint, () => {
        this.viewer.parametricManager.constraintUpdated(obj.constraint);
      })
    }
  }

  startDragging(e) {}
}

export class PanTool extends BasePanTool {
  constructor(viewer) {
    super(viewer);
    this.dragging = false;
    this.marquee = false;
    this.x = 0.0;
    this.y = 0.0;
    this.marqueeStartX = 0;
    this.marqueeStartY = 0;
    this.marqueeEndX = 0;
    this.marqueeEndY = 0;
    this.marqueeThreshold = 5;
    this._windowMouseUp = null;
    this._windowMouseMove = null;
  }

  mousemove(e) {
    if (!this.dragging) {
      return;
    }
    
    const dx = e.pageX - this.x;
    const dy = e.pageY - this.y;
    const totalDist = Math.hypot(e.pageX - this.startPageX, e.pageY - this.startPageY);
    
    // Check if we should enter marquee mode
    if (!this.marquee && totalDist > this.marqueeThreshold) {
      this.marquee = true;
      this.deselectOnUp = false;
    }
    
    if (this.marquee) {
      // Update marquee rectangle in screen coordinates
      this.marqueeEndX = e.offsetX;
      this.marqueeEndY = e.offsetY;
      this._drawMarquee();
      return;
    }
    
    // Pan mode
    let panDy = dy * -1;
    this.viewer.translate.x += dx * this.viewer.retinaPxielRatio;
    this.viewer.translate.y += panDy * this.viewer.retinaPxielRatio;

    this.x = e.pageX;
    this.y = e.pageY;
    this.deselectOnUp = false;
    this.viewer.refresh();
  }

  startDragging(e) {
    super.startDragging(e);
    this.dragging = true;
    this.marquee = false;
    this.deselectOnUp = true;
    this.x = e.pageX;
    this.y = e.pageY;
    this.startPageX = e.pageX;
    this.startPageY = e.pageY;
    this.marqueeStartX = e.offsetX;
    this.marqueeStartY = e.offsetY;
    this.marqueeEndX = e.offsetX;
    this.marqueeEndY = e.offsetY;
    
    // Listen on window so mouseup fires even if cursor leaves canvas
    this._cleanupWindowListeners();
    const canvas = this.viewer.canvas;
    const canvasRect = canvas.getBoundingClientRect();
    
    this._windowMouseUp = (e) => {
      // Translate page coords to canvas-local offsetX/offsetY
      e.offsetX = e.pageX - canvasRect.left;
      e.offsetY = e.pageY - canvasRect.top;
      this.mouseup(e);
    };
    this._windowMouseMove = (e) => {
      e.offsetX = e.pageX - canvasRect.left;
      e.offsetY = e.pageY - canvasRect.top;
      this.mousemove(e);
    };
    window.addEventListener('mouseup', this._windowMouseUp, false);
    window.addEventListener('mousemove', this._windowMouseMove, false);
  }

  _cleanupWindowListeners() {
    if (this._windowMouseUp) {
      window.removeEventListener('mouseup', this._windowMouseUp, false);
      this._windowMouseUp = null;
    }
    if (this._windowMouseMove) {
      window.removeEventListener('mousemove', this._windowMouseMove, false);
      this._windowMouseMove = null;
    }
  }

  mouseup(e) {
    this._cleanupWindowListeners();
    if (this.marquee) {
      this._selectInMarquee(e.shiftKey);
      this.marquee = false;
      this.viewer.refresh();
    } else if (this.deselectOnUp) {
      this.viewer.deselectAll();
      this.viewer.refresh();
    }
    this.dragging = false;
    this.deselectOnUp = false;
  }

  _drawMarquee() {
    const canvas = this.viewer.canvas;
    const ctx = this.viewer.ctx;
    
    // Redraw the scene
    this.viewer.repaint();
    
    const x = Math.min(this.marqueeStartX, this.marqueeEndX);
    const y = Math.min(this.marqueeStartY, this.marqueeEndY);
    const w = Math.abs(this.marqueeEndX - this.marqueeStartX);
    const h = Math.abs(this.marqueeEndY - this.marqueeStartY);
    
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(this.viewer.retinaPxielRatio, this.viewer.retinaPxielRatio);
    
    // Left-to-right = window select (solid), right-to-left = crossing select (dashed)
    const leftToRight = this.marqueeEndX >= this.marqueeStartX;
    
    if (leftToRight) {
      ctx.strokeStyle = 'rgba(100, 160, 255, 0.9)';
      ctx.fillStyle = 'rgba(100, 160, 255, 0.1)';
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = 'rgba(100, 255, 160, 0.9)';
      ctx.fillStyle = 'rgba(100, 255, 160, 0.08)';
      ctx.setLineDash([5, 3]);
    }
    
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    ctx.restore();
  }

  _selectInMarquee(shiftKey) {
    const viewer = this.viewer;
    
    // Convert marquee corners to model coordinates
    const topLeft = viewer._screenToModel(this.marqueeStartX, this.marqueeStartY);
    const bottomRight = viewer._screenToModel(this.marqueeEndX, this.marqueeEndY);
    
    const x1 = Math.min(topLeft.x, bottomRight.x);
    const y1 = Math.min(topLeft.y, bottomRight.y);
    const x2 = Math.max(topLeft.x, bottomRight.x);
    const y2 = Math.max(topLeft.y, bottomRight.y);
    
    const leftToRight = this.marqueeEndX >= this.marqueeStartX;
    
    // Collect all selectable objects — _workspace is [layers[], dimLayers[]]
    const toSelect = [];
    for (const layerGroup of viewer._workspace) {
      for (const layer of layerGroup) {
        for (const obj of layer.objects) {
          if (!obj.visible) continue;
          if (obj.readOnly) continue;
          const bbox = this._getBBox(obj);
          if (!bbox) continue;
          
          if (leftToRight) {
            // Window: object must be fully inside
            if (bbox.x1 >= x1 && bbox.y1 >= y1 && bbox.x2 <= x2 && bbox.y2 <= y2) {
              toSelect.push(obj);
            }
          } else {
            // Crossing: any overlap
            if (bbox.x2 >= x1 && bbox.x1 <= x2 && bbox.y2 >= y1 && bbox.y1 <= y2) {
              toSelect.push(obj);
            }
          }
        }
      }
    }
    
    if (!shiftKey) {
      viewer.deselectAll();
    }
    viewer.select(toSelect, false);
  }

  _getBBox(obj) {
    // Segment: has .a and .b EndPoints
    if (obj.a && obj.b && obj.a.x !== undefined && obj.b.x !== undefined) {
      return {
        x1: Math.min(obj.a.x, obj.b.x),
        y1: Math.min(obj.a.y, obj.b.y),
        x2: Math.max(obj.a.x, obj.b.x),
        y2: Math.max(obj.a.y, obj.b.y)
      };
    }
    // Circle: has .c (EndPoint) and .r (Param)
    if (obj.c && obj.r !== undefined) {
      const r = obj.r.value !== undefined ? obj.r.value : obj.r;
      return {
        x1: obj.c.x - r,
        y1: obj.c.y - r,
        x2: obj.c.x + r,
        y2: obj.c.y + r
      };
    }
    // Point/EndPoint: has .x and .y directly
    if (obj.x !== undefined && obj.y !== undefined) {
      return { x1: obj.x, y1: obj.y, x2: obj.x, y2: obj.y };
    }
    // Arc: has .a, .b, .c EndPoints and .r
    if (obj.a && obj.b && obj.c && obj.r !== undefined) {
      const r = obj.r.value !== undefined ? obj.r.value : obj.r;
      const minX = Math.min(obj.a.x, obj.b.x, obj.c.x - r);
      const minY = Math.min(obj.a.y, obj.b.y, obj.c.y - r);
      const maxX = Math.max(obj.a.x, obj.b.x, obj.c.x + r);
      const maxY = Math.max(obj.a.y, obj.b.y, obj.c.y + r);
      return { x1: minX, y1: minY, x2: maxX, y2: maxY };
    }
    return null;
  }

  mousewheel(e) {
    let delta = 0;
    if (e.wheelDelta) {
      delta = e.wheelDelta;
    } else if (e.deltaY) {
      delta = -e.deltaY;
    }

    const before = this.viewer.screenToModel(e);
    const step = 0.05;
    delta = delta < 0 ? 1 - step : 1 + step;
    this.viewer.scale *= delta;
    const after = this.viewer.screenToModel(e);

    const dx = after.x - before.x;
    const dy = after.y - before.y;
    this.viewer.translate.x += dx * this.viewer.scale;
    this.viewer.translate.y += dy * this.viewer.scale;
    this.viewer.refresh();
  }
}

export class DelegatingPanTool extends BasePanTool {

  constructor(viewer, delegate) {
    super(viewer);
    this.delegate = delegate;
  }
  
  startDragging(e) {
    this.delegate.dispatchEvent(cloneEvent(e));
  }

  mouseup(e) {
    this.delegate.dispatchEvent(cloneEvent(e));
  }

  mousewheel(e) {
    this.delegate.dispatchEvent(cloneEvent(e));
  }
}

function cloneEvent(event) {
  return new event.constructor(event.type, event)
}
