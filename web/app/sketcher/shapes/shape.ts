import {Viewer} from "../viewer2d";

export class Shape {

  visible: boolean = true;
  style: any = null;
  role: string = null;

  accept(visitor: (shape: Shape) => boolean): boolean {
    return visitor(this);
  }

  draw(ctx: CanvasRenderingContext2D, scale: number, viewer: Viewer) {
  }
}
