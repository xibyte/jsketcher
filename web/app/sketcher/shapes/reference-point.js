import {Shape} from './shape'

export class ReferencePoint extends Shape {
  constructor() {
    super();
    this.x = 0;
    this.y = 0;
  }
  
  draw(ctx, scale) {
    if (!this.visible) return;
    ctx.strokeStyle  = 'salmon';
    ctx.fillStyle  = 'salmon';
    ctx.lineWidth = 1 / scale;
  
    ctx.beginPath();
    ctx.arc(this.x, this.y, 1 / scale, 0, 2 * Math.PI, false);
    ctx.fill();
  
    ctx.beginPath();
    ctx.arc(this.x, this.y, 7 / scale, 0, 2 * Math.PI, false);
    ctx.stroke();
  }
}

