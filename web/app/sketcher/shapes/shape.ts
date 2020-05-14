import {Viewer} from "../viewer2d";

export class Shape {

  visible: boolean = true;
  style: any = null;
  role: string = null;

  accept(visitor) {
    return visitor(this);
  }

  draw(ctx: any, scale: number, viewer: Viewer) {
  }
}
