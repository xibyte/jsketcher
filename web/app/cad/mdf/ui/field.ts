import {OperationParamValue, ValueResolver} from "cad/craft/schema/schema";
import {ParamsPathSegment} from "cad/craft/wizard/wizardTypes";

export interface FieldBasicProps {

  name: ParamsPathSegment;

  label?: string;

  defaultValue?: OperationParamValue;

  optional?: boolean;

  resolve?: ValueResolver<any, any>
}

export function fieldToSchemaGeneric(props: FieldBasicProps) {
  return {
      label: props.label,
      defaultValue: props.defaultValue,
      optional: !!props.optional,
      resolve: props.resolve
  }
}