import {ApplicationContext} from "cad/context";
import {OperationParams, OperationParamsErrorReporter, OperationSchema, SchemaField} from "cad/craft/schema/schema";
import {ArrayType} from "cad/craft/schema/types/arrayType";
import {EntityType} from "cad/craft/schema/types/entityType";
import {NumberType} from "cad/craft/schema/types/numberType";
import {ObjectType} from "cad/craft/schema/types/objectType";
import {StringType} from "cad/craft/schema/types/stringType";
import {BooleanType} from "cad/craft/schema/types/booleanType";

export type Materializer = (ctx: ApplicationContext,
  params: OperationParams,
  schema: OperationSchema,
  result: any,
  reportError: OperationParamsErrorReporter) => void;

export interface Type<IN, OUT, METADATA extends SchemaField> {

  resolve(ctx: ApplicationContext, value: IN, md: METADATA,
          reportError: OperationParamsErrorReporter,
          materializer: Materializer): OUT;

}

export enum Types {
  array = 'array',
  object = 'object',
  entity = 'entity',
  number = 'number',
  boolean = 'boolean',
  string = 'string'
}

export const TypeRegistry = {
  [Types.array]: ArrayType,
  [Types.object]: ObjectType,
  [Types.entity]: EntityType,
  [Types.number]: NumberType,
  [Types.boolean]: BooleanType,
  [Types.string]: StringType,
};
