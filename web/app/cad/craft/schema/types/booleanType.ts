import {Materializer, Type, Types} from "cad/craft/schema/types/index";
import {ApplicationContext} from "cad/context";
import {BaseSchemaField, OperationParamsErrorReporter} from "cad/craft/schema/schema";

export interface BooleanTypeSchema extends BaseSchemaField {

  type: Types.boolean,

}

export const BooleanType: Type<any, boolean, BooleanTypeSchema> = {

  resolve(ctx: ApplicationContext,
          value: any,
          md: BooleanTypeSchema,
          reportError: OperationParamsErrorReporter,
          materializer: Materializer): boolean {
    return !!value;
  }
}
