import {Tool} from './tool';

import {marqueeBounds} from './marquee-bounds';

export class MarqueeTool extends Tool {
  constructor(viewer) {
    super('Select area', viewer);
    this.pointer = null;
    this.overlay = null;
    this.oldTouchAction = '';
    this.down = this.down.bind(this);
    this.move = this.move.bind(this);
    this.up = this.up.bind(this);
    this.cancel = this.cancel.bind(this);
  }
  restart() {
    const canvas = this.viewer.canvas;
    this.canvas = canvas;
    this.oldTouchAction = canvas.style.touchAction;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.cancel);
    canvas.addEventListener('lostpointercapture', this.cancel);
    this.sendHint('Drag to select by bounds. Left to right: contained; right to left: intersecting. Hold Shift to add.');
  }
  down(e) {
    if (this.pointer !== null || !e.isPrimary || e.button !== 0) return;
    this.pointer = e.pointerId;
    e.currentTarget.focus();
    this.start = {x: e.clientX, y: e.clientY};
    this.end = this.start;
    this.add = e.shiftKey;
    this.overlay = document.createElement('div');
    this.overlay.dataset.codiMarquee = 'selection';
    Object.assign(this.overlay.style, {position: 'fixed', pointerEvents: 'none', zIndex: '2147483647', border: '1px solid #64a0ff', background: 'rgba(100,160,255,.12)'});
    document.body.append(this.overlay);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    this.draw();
  }
  move(e) {
    if (e.pointerId !== this.pointer) return;
    this.end = {x: e.clientX, y: e.clientY};
    this.draw();
    e.preventDefault();
  }
  draw() {
    if (!this.overlay) return;
    const a = this.start, b = this.end;
    Object.assign(this.overlay.style, {left: Math.min(a.x, b.x) + 'px', top: Math.min(a.y, b.y) + 'px',
      width: Math.abs(a.x - b.x) + 'px', height: Math.abs(a.y - b.y) + 'px',
      borderStyle: b.x >= a.x ? 'solid' : 'dashed'});
  }
  up(e) {
    if (e.pointerId !== this.pointer) return;
    this.end = {x: e.clientX, y: e.clientY};
    const start = this.start, end = this.end, add = this.add || e.shiftKey;
    this.clearGesture();
    if (Math.hypot(end.x - start.x, end.y - start.y) >= 5) {
      const rect = this.viewer.canvas.getBoundingClientRect();
      const corners = [[start.x,start.y],[start.x,end.y],[end.x,start.y],[end.x,end.y]]
        .map(([x,y]) => this.viewer._screenToModel(x - rect.left, y - rect.top));
      const selection = {minX: Math.min(...corners.map(p => p.x)), minY: Math.min(...corners.map(p => p.y)),
        maxX: Math.max(...corners.map(p => p.x)), maxY: Math.max(...corners.map(p => p.y))};
      const contains = end.x >= start.x;
      const selected = this.viewer.activeLayer.objects.filter(object => {
        if (object.readOnly || object.visible === false || object.stage === this.viewer.parametricManager.groundStage) return false;
        const b = marqueeBounds(object);
        return b && (contains ? b.minX >= selection.minX && b.maxX <= selection.maxX && b.minY >= selection.minY && b.maxY <= selection.maxY :
          b.maxX >= selection.minX && b.minX <= selection.maxX && b.maxY >= selection.minY && b.minY <= selection.maxY);
      });
      this.viewer.select(selected, !add);
      this.viewer.refresh();
    }
    this.viewer.toolManager.releaseControl();
  }
  cancel(e) {
    if (e && e.pointerId !== this.pointer) return;
    this.clearGesture();
  }
  clearGesture() {
    const canvas = this.canvas, pointer = this.pointer;
    this.pointer = null;
    if (this.overlay) this.overlay.remove();
    this.overlay = null;
    if (pointer !== null && canvas?.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
  }
  cleanup() {
    const canvas = this.canvas;
    this.clearGesture();
    if (!canvas) return;
    canvas.removeEventListener('pointerdown', this.down);
    canvas.removeEventListener('pointermove', this.move);
    canvas.removeEventListener('pointerup', this.up);
    canvas.removeEventListener('pointercancel', this.cancel);
    canvas.removeEventListener('lostpointercapture', this.cancel);
    canvas.style.touchAction = this.oldTouchAction;
    this.canvas = null;
  }
}
