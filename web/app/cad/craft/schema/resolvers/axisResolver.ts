import {Materializer} from "cad/craft/schema/types/index";
import {CoreContext} from "context";
import {OperationParamsErrorReporter} from "cad/craft/schema/schema";
import {MObject} from "cad/model/mobject";
import {ObjectTypeSchema} from "cad/craft/schema/types/objectType";
import Axis from "math/axis";

type AxisInput = {
  vectorEntity: MObject,
  flip: boolean
}

export function AxisResolver(ctx: CoreContext,
                             value: AxisInput,
                             md: ObjectTypeSchema,
                             reportError: OperationParamsErrorReporter, materializer: Materializer): Axis {

  if (!value.vectorEntity) {
    return null;
  }
  
  let axis = value.vectorEntity.toAxis(value.flip);
  if (!axis) {
    throw 'unsupported entity type: ' + value.vectorEntity.TYPE;
  }
  return axis;
}
