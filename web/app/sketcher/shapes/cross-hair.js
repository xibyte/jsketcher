import {Shape} from './shape'

export class CrossHair extends Shape {
  constructor (x, y, rad) {
    super();
    this.x = x;
    this.y = y;
    this.rad = rad;
    this.style = null;
  }

  draw(ctx, scale) {
    ctx.beginPath();
    var rad = this.rad / scale;
    ctx.moveTo(this.x - rad, this.y);
    ctx.lineTo(this.x + rad, this.y);
    ctx.closePath();
    ctx.moveTo(this.x, this.y - rad);
    ctx.lineTo(this.x, this.y + rad);
    ctx.closePath();
  
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.stroke();
    ctx.restore();
  }
}

