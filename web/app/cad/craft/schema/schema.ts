import {Types} from "cad/craft/schema/types";
import {NumberTypeSchema} from "cad/craft/schema/types/numberType";
import {EntityTypeSchema} from "cad/craft/schema/types/entityType";
import {ArrayTypeSchema} from "cad/craft/schema/types/arrayType";
import {ObjectTypeSchema} from "cad/craft/schema/types/objectType";
import {EnumTypeSchema} from "cad/craft/schema/types/enumType";

export type SchemaField = NumberTypeSchema | EntityTypeSchema | ArrayTypeSchema | ObjectTypeSchema | EnumTypeSchema;

export type OperationSchema = {
  [key: string]: SchemaField;
};

export interface BaseSchemaField {
  defaultValue: Coercable,
  optional: boolean,
  label?: string
}

export type Coercable = any;

export type OperationParams = {
  [key: string]: Coercable
}

export type OperationParamsError = {
  path: string[],
  message: string
};

export type OperationParamsErrorReporter = ((msg: string) => void) & {
  dot: (pathPart: string|number) => OperationParamsErrorReporter
};