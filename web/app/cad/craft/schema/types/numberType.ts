import {Materializer, Type, TypeRegistry, Types} from "cad/craft/schema/types/index";
import {CoreContext} from "cad/context";
import {BaseSchemaField, OperationParamsErrorReporter, SchemaField} from "cad/craft/schema/schema";
import {EntityType} from "cad/craft/schema/types/entityType";

export interface NumberTypeSchema extends BaseSchemaField {

  type: Types.number,

  min: number;

  max: number;

}

export const NumberType: Type<any, number, NumberTypeSchema> = {

  resolve(ctx: CoreContext,
          value: any,
          md: NumberTypeSchema,
          reportError: OperationParamsErrorReporter,
          materializer: Materializer): number {

    try {
      const valueType = typeof value;
      if (valueType === 'string') {
        value = ctx.expressionService.evaluateExpression(value);
      } else if (valueType !== 'number') {
        reportError('invalid value');
      }
    } catch (e) {
      reportError('unable to evaluate expression');
    }

    if (md.min !== undefined) {
      if (value < md.min) {
        reportError('less than allowed');
      }
    }
    if (md.max !== undefined) {
      if (value > md.max) {
        reportError('greater than allowed');
      }
    }
    return value;
  }
}
