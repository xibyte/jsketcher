import {Tool} from './tool'

export class PanTool extends Tool {
  constructor(viewer) {
    super('pan', viewer);
    this.dragging = false;
    this.x = 0.0;
    this.y = 0.0;
  }

  mousemove(e) {
    if (!this.dragging) {
      return;
    }
    var dx = e.pageX - this.x;
    var dy = e.pageY - this.y;
    dy *= -1;

    this.viewer.translate.x += dx * this.viewer.retinaPxielRatio;
    this.viewer.translate.y += dy * this.viewer.retinaPxielRatio;

    this.x = e.pageX;
    this.y = e.pageY;
    this.deselectOnUp = false;
    this.viewer.refresh();
  }

  mousedown(e) {
    if (e.button == 0) {
      var picked = this.viewer.pick(e);
      var i;
      if (picked.length > 0) {
        var toSelect;
        if (e.shiftKey) {
          toSelect = picked[0];
          var ids = this.viewer.selected.map(function (s) {
            return s.id
          });
          for (i = 0; i < picked.length; i++) {
            if (ids.indexOf(picked[i].id) != -1) {
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
              if (picked[i].id == this.viewer.selected[0].id) {
                toSelect = picked[i + 1];
                break;
              }
            }
          }
          this.viewer.select([toSelect], true);
          if (!toSelect.isAuxOrLinkedTo()) {
            var tool = toSelect.getDefaultTool(this.viewer);
            tool.mousedown(e);
            this.viewer.toolManager.switchTool(tool);
          }
        }
        this.viewer.refresh();
        return;
      }
    }

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

    var delta = 0;

    if (e.wheelDelta) { // WebKit / Opera / Explorer 9
      delta = e.wheelDelta;
    } else if (e.detail) { // Firefox
      delta = -e.detail;
    }

    var before = this.viewer.screenToModel(e);

    var step = 0.05;
    delta = delta < 0 ? 1 - step : 1 + step;
    this.viewer.scale *= delta;

    var after = this.viewer.screenToModel(e);

    var dx = after.x - before.x;
    var dy = after.y - before.y;

    this.viewer.translate.x += dx * this.viewer.scale;
    this.viewer.translate.y += dy * this.viewer.scale;

    this.viewer.refresh();
  }
}