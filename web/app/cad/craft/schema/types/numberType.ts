import {Materializer, Type, Types} from "cad/craft/schema/types/index";
import {ApplicationContext} from "cad/context";
import {BaseSchemaField, OperationParamsErrorReporter} from "cad/craft/schema/schema";

export interface NumberTypeSchema extends BaseSchemaField {

  type: Types.number,

  min: number;

  max: number;

}

export const NumberType: Type<any, number, NumberTypeSchema> = {

  resolve(ctx: ApplicationContext,
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
