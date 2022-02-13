import React from "react";
import {OperationSchema} from "cad/craft/schema/schema";
import {FieldBasicProps, fieldToSchemaGeneric} from "cad/mdf/ui/field";
import {Types} from "cad/craft/schema/types";
import {CheckboxField} from "cad/craft/wizard/components/form/Fields";

export interface CheckboxWidgetProps extends FieldBasicProps {

  type: 'checkbox';

  min?: number;

  max?: number;
}

export function CheckboxWidget(props: CheckboxWidgetProps) {
  return <CheckboxField name={props.name} defaultValue={props.defaultValue} label={props.label} />
}

CheckboxWidget.propsToSchema = (props: CheckboxWidgetProps) => {
  return {
    type: Types.boolean,
    ...fieldToSchemaGeneric(props),
  }
};


