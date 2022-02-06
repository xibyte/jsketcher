import {Materializer, Type, TypeRegistry, Types} from "cad/craft/schema/types/index";
import {CoreContext} from "context";
import {BaseSchemaField, OperationParamsErrorReporter, OperationSchema} from "cad/craft/schema/schema";

export interface ObjectTypeSchema extends BaseSchemaField {

  type: Types.object;

  schema: OperationSchema;

  resolver: (input: any) => any;

}

export const ObjectType: Type<any, any, ObjectTypeSchema> = {

  resolve(ctx: CoreContext,
          value: any,
          md: ObjectTypeSchema,
          reportError: OperationParamsErrorReporter,
          materializer: Materializer): any {

    const result = {};
    materializer(ctx, value, md.schema, result, reportError);
    return result;
  }
}
