import {Type, TypeRegistry, Types} from "cad/craft/schema/types/index";
import {CoreContext} from "context";
import {BaseSchemaField, OperationParamsErrorReporter} from "cad/craft/schema/schema";
import {EntityKind} from "cad/model/entities";
import {MObject} from "cad/model/mobject";

export interface EntityTypeSchema extends BaseSchemaField {

  type: Types.entity,

  allowedKinds: EntityKind[];

  initializeBySelection: boolean | number;
}

export const EntityType: Type<string, MObject, EntityTypeSchema> = {

  resolve(ctx: CoreContext,
          value: string,
          md: EntityTypeSchema,
          reportError: OperationParamsErrorReporter): MObject {

    if (typeof value !== 'string') {
      reportError('not a valid model reference');
    }
    let ref = value.trim();
    if (!ref && !md.optional) {
      reportError('required');
    }
    let model = ctx.cadRegistry.find(ref);
    if (!model) {
      reportError('refers to a nonexistent object');
    }
    return model;
  }

}
