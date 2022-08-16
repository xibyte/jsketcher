import {Type, Types} from "cad/craft/schema/types/index";
import {ApplicationContext} from "cad/context";
import {BaseSchemaField, OperationParamsErrorReporter} from "cad/craft/schema/schema";
import {EntityKind} from "cad/model/entities";
import {MObject} from "cad/model/mobject";

export interface EntityTypeSchema extends BaseSchemaField {

  type: Types.entity,

  entityCapture: EntityCapture,

  defaultValue?: {
    usePreselection: boolean;
    preselectionIndex: number;
  },

  markColor?: string | number
}

export type EntityCapture = (entity: MObject) => boolean;

export const EntityType: Type<string, MObject, EntityTypeSchema> = {

  resolve(ctx: ApplicationContext,
          value: string,
          md: EntityTypeSchema,
          reportError: OperationParamsErrorReporter): MObject {

    if (typeof value !== 'string') {
      reportError('not a valid model reference');
    }
    const ref = value.trim();
    if (!ref && !md.optional) {
      reportError('required');
    }
    const model = ctx.cadRegistry.find(ref);
    if (!model) {
      reportError('refers to a nonexistent object');
    }
    return model;
  }

}

export function entityKindCapture(...allowedKinds: EntityKind[]) {

  return e => allowedKinds.includes(e.TYPE);

}

