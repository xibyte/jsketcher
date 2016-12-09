
export class Shape {

  constructor() {
    this.visible = true;
    this.style = null;
    this.role = null;
  }

  accept(visitor) {
    return visitor(this);
  }

  draw(ctx, scale) {
  }
}
