
export class Shape {

  constructor() {
    this.visible = true;
  }

  accept(visitor) {
    return visitor(this);
  }

  draw(ctx, scale) {
  }
}
