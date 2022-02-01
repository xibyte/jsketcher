import {Materializer, Type, TypeRegistry, Types} from "cad/craft/schema/types/index";
import {CoreContext} from "context";
import {BaseSchemaField, OperationParamsErrorReporter} from "cad/craft/schema/schema";

export interface EnumTypeSchema extends BaseSchemaField {

  type: Types.number,

  values: string[]

}

export const EnumType: Type<any, number, EnumTypeSchema> = {

  resolve(ctx: CoreContext,
          value: any,
          md: EnumTypeSchema,
          reportError: OperationParamsErrorReporter,
          materializer: Materializer): number {

    if (md.values.indexOf(value) === -1) {
      value = md.defaultValue || md.values[0];
    }
    return value;
  }
}
