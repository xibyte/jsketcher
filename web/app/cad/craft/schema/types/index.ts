import {CoreContext} from "context";
import {OperationParams, OperationParamsErrorReporter, OperationSchema, SchemaField} from "cad/craft/schema/schema";
import {ArrayType} from "cad/craft/schema/types/arrayType";
import {EntityType} from "cad/craft/schema/types/entityType";
import {NumberType} from "cad/craft/schema/types/numberType";
import {ObjectType} from "cad/craft/schema/types/objectType";
import {EnumType} from "cad/craft/schema/types/enumType";

export type Materializer = (ctx: CoreContext,
  params: OperationParams,
  schema: OperationSchema,
  result: any,
  reportError: OperationParamsErrorReporter) => void;

export interface Type<IN, OUT, METADATA extends SchemaField> {

  resolve(ctx: CoreContext, value: IN, md: METADATA,
          reportError: OperationParamsErrorReporter,
          materializer: Materializer): OUT;

}

export enum Types {
  array = 'array',
  entity = 'entity',
  number = 'number',
  object = 'object',
  enum = 'enum',
}

export const TypeRegistry = {
  [Types.array]: ArrayType,
  [Types.entity]: EntityType,
  [Types.number]: NumberType,
  [Types.object]: ObjectType,
  [Types.enum]: EnumType,
};
