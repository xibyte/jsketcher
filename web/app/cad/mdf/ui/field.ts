import {Coercable} from "cad/craft/schema/schema";

export interface FieldBasicProps {

  name: string;

  label?: string;

  defaultValue?: Coercable;

  optional?: boolean
}

export function fieldToSchemaGeneric(props: FieldBasicProps) {
  return {
      label: props.label,
      defaultValue: props.defaultValue,
      optional: !!props.optional,
  }
}