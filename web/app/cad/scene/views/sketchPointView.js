import {View} from "cad/scene/views/view";
import {VertexObject} from "cad/scene/views/vertexView";

export class SketchPointView extends View {

  constructor(ctx, sketchPoint, sketchTr) {
    super(ctx, sketchPoint);
    this.rootGroup = new VertexObject(ctx.viewer, 15, 100, () => this.rootGroup.position, true, 0x0000FF);

    sketchTr.__apply(sketchPoint.sketchPrimitive.pt, this.rootGroup.position);
  }

  dispose() {
    this.rootGroup.dispose();
    super.dispose();
    // this.rootGroup.dispose();
  }
}
