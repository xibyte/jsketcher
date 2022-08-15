import {Materializer, Type, TypeRegistry, Types} from "cad/craft/schema/types/index";
import {ApplicationContext} from "cad/context";
import {BaseSchemaField, OperationParamsErrorReporter, SchemaField} from "cad/craft/schema/schema";

export interface ArrayTypeSchema extends BaseSchemaField {

  type: Types.array;

  items: SchemaField;

  min: number;

  max: number;

  defaultValue: {
    usePreselection: boolean;
  }
}

export const ArrayType: Type<any[], any[], ArrayTypeSchema> = {

  resolve(ctx: ApplicationContext,
          value: any[],
          md: ArrayTypeSchema,
          reportError: OperationParamsErrorReporter,
          materializer: Materializer): any[] {

      if (!value || !Array.isArray(value)) {
        reportError('not an array type');
        return [];
      }
      if (md.min !== undefined && value.length < md.min) {
        reportError('required minimum ' + md.min + ' elements');
      }
      if (md.max !== undefined && value.length > md.max) {
        reportError('required maximum ' + md.max + ' elements');
      }

      const itemType = TypeRegistry[md.items.type];

      return value.map((v, i) => itemType.resolve(ctx, v, md.items as any, reportError.dot(i), materializer));
  }
}
