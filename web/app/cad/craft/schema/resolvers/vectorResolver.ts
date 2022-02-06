import {Materializer} from "cad/craft/schema/types/index";
import {CoreContext} from "context";
import {OperationParamsErrorReporter} from "cad/craft/schema/schema";
import Vector from "math/vector";
import {MObject} from "cad/model/mobject";
import {ObjectTypeSchema} from "cad/craft/schema/types/objectType";

type VectorInput = {
  vectorEntity: MObject,
  flip: boolean
}

export function VectorResolver(ctx: CoreContext,
  value: VectorInput,
  md: ObjectTypeSchema,
  reportError: OperationParamsErrorReporter,
                              materializer: Materializer): Vector {

  if (!value.vectorEntity) {
    return null;
  }
  
  let vector = value.vectorEntity.toDirection();
  if (!vector) {
    throw 'unsupported entity type: ' + value.vectorEntity.TYPE;
  }
  if (value.flip) {
    vector = vector.negate();
  }
  return vector;
}
