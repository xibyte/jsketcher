import * as draw_utils from './draw-utils'
import {Shape} from './shape'

export class Point extends Shape {
  
  constructor(x, y, rad) {
    super();
    this.x = x;
    this.y = y;
    this.rad = rad;
    this.style = null;
  }

  draw(ctx, scale) {
    draw_utils.DrawPoint(ctx, this.x, this.y, this.rad, scale);
  }
}