import {Shape} from './shape'

export class BasisOrigin extends Shape {
  constructor (basis, viewer) {
    super();
    this.viewer = viewer;
    this.inverseX = false;
    this.inverseY = false;
    this.lineWidth = 100;
    this.xColor = '#FF0000';
    this.yColor = '#00FF00';
  }
  
  draw(ctx, scale) {
    ctx.save();
    if (this.inverseX) {
      this.xScale = -1;
      this.xShift = this.lineWidth + 10;
    } else {
      this.xScale = 1;
      this.xShift = 10;
    }
    if (this.inverseY) {
      this.yScale = -1;
      this.yShift = this.viewer.canvas.height - this.lineWidth - 10;
    } else {
      this.yScale = 1;
      this.yShift = this.viewer.canvas.height - 10;
    }
  
    ctx.setTransform( this.xScale, 0, 0, this.yScale, this.xShift, this.yShift);
    ctx.beginPath();
  
    ctx.lineWidth  = 1;
    ctx.strokeStyle  = this.yColor;
  
    const headA = 1;
    const headB = 10;
  
    ctx.moveTo(0.5, 0);
    ctx.lineTo(0.5, - this.lineWidth);
  
    ctx.moveTo(0, - this.lineWidth);
    ctx.lineTo(headA, 0 - this.lineWidth + headB);
  
    ctx.moveTo(0, - this.lineWidth);
    ctx.lineTo(- headA, - this.lineWidth + headB);
    ctx.closePath();
    ctx.stroke();
  
    ctx.beginPath();
    ctx.strokeStyle  = this.xColor;
    ctx.moveTo(0, 0.5);
    ctx.lineTo(this.lineWidth, 0.5);
  
    ctx.moveTo(this.lineWidth, 0);
    ctx.lineTo(this.lineWidth - headB, headA);
  
    ctx.moveTo(this.lineWidth, 0);
    ctx.lineTo(this.lineWidth - headB, - headA);
    ctx.closePath();
    ctx.stroke();
  
    ctx.restore();
  }
}
