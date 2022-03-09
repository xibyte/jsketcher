import {CurveBasedView} from './curveBasedView';

export class SketchObjectView extends CurveBasedView {
  
  constructor(mSketchObject, sketchToWorldTransformation) {
    const color = mSketchObject.construction ? 0x777777 : 0x0000FF;
    const tess = mSketchObject.sketchPrimitive.tessellate(10).map(sketchToWorldTransformation.apply).map(v => v.data());
    super(mSketchObject, tess, 3, 4, color, 0x49FFA5);
  }
}
