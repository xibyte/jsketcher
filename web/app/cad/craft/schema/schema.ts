import {NumberTypeSchema} from "cad/craft/schema/types/numberType";
import {EntityTypeSchema} from "cad/craft/schema/types/entityType";
import {ArrayTypeSchema} from "cad/craft/schema/types/arrayType";
import {ObjectTypeSchema} from "cad/craft/schema/types/objectType";
import {StringTypeSchema} from "cad/craft/schema/types/stringType";
import {BooleanTypeSchema} from "cad/craft/schema/types/booleanType";

export type FlatSchemaField =
  | ArrayTypeSchema
  | EntityTypeSchema
  | NumberTypeSchema
  | StringTypeSchema
  | BooleanTypeSchema;

export type SchemaField = FlatSchemaField | ObjectTypeSchema;

export type OperationSchema = {
  [key: string]: SchemaField;
};

export type OperationFlattenSchema = {
  [key: string]: FlatSchemaField;
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

export function schemaIterator(schema: OperationSchema,
                               callback: (path: string[], flattenedPath: string, field: FlatSchemaField) => void) {

  function inorder(schema: OperationSchema, parentPath: string[]) {

    Object.keys(schema).forEach(key => {
      const path = [...parentPath, key]
      const flattenedPath = path.join('/');
      const schemaField = schema[key];


      if (schemaField.type === 'object') {
        inorder(schemaField.schema, path);
      } else {
        callback(path, flattenedPath, schemaField as FlatSchemaField);
      }
    })

  }
  inorder(schema, []);
}