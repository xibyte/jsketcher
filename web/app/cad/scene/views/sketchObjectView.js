import {CurveBasedView} from './curveBasedView';

export class SketchObjectView extends CurveBasedView {
  
  constructor(mSketchObject, sketchToWorldTransformation) {
    const color = mSketchObject.construction ? 0x777777 : 0xFFFFFF;
    const tess = mSketchObject.sketchPrimitive.tessellate(10).map(sketchToWorldTransformation.apply).map(v => v.data());
    super(mSketchObject, tess, 1, 2, color, 0x49FFA5);
  }
}
