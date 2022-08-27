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
    this.x = 0.0;
    this.y = 0.0;
  }

  mousemove(e) {
    if (!this.dragging) {
      return;
    }
    const dx = e.pageX - this.x;
    let dy = e.pageY - this.y;
    dy *= -1;

    this.viewer.translate.x += dx * this.viewer.retinaPxielRatio;
    this.viewer.translate.y += dy * this.viewer.retinaPxielRatio;

    this.x = e.pageX;
    this.y = e.pageY;
    this.deselectOnUp = false;
    this.viewer.refresh();
  }

  startDragging(e) {
    super.startDragging(e);
    this.dragging = true;
    this.deselectOnUp = true;
    this.x = e.pageX;
    this.y = e.pageY;
  }

  mouseup(e) {
    this.dragging = false;
    if (this.deselectOnUp) {
      this.viewer.deselectAll();
      this.viewer.refresh();
    }
    this.deselectOnUp = false;
  }

  mousewheel(e) {

    let delta = 0;

    if (e.wheelDelta) { // WebKit / Opera / Explorer 9
      delta = e.wheelDelta;
    } else if (e.deltaY) { // Firefox
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

  // mousemove(e) {
  //   this.delegate.dispatchEvent(cloneEvent(e));
  // };
  
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