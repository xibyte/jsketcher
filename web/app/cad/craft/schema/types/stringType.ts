import {Materializer, Type, Types} from "cad/craft/schema/types/index";
import {ApplicationContext} from "cad/context";
import {BaseSchemaField, OperationParamsErrorReporter} from "cad/craft/schema/schema";

export interface StringTypeSchema extends BaseSchemaField {

  type: Types.string,

  enum?: string[]

}

export const StringType: Type<any, string, StringTypeSchema> = {

  resolve(ctx: ApplicationContext,
          value: any,
          md: StringTypeSchema,
          reportError: OperationParamsErrorReporter,
          materializer: Materializer): string {

    value = value + '';

    if (md.enum && md.enum.indexOf(value) === -1) {
      value = md.defaultValue || md.enum[0];
    }

    return value;
  }
}
