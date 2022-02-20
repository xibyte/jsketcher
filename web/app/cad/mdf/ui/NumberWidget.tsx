import {NumberField} from "cad/craft/wizard/components/form/Fields";
import React from "react";
import {FieldBasicProps, fieldToSchemaGeneric} from "cad/mdf/ui/field";
import {Types} from "cad/craft/schema/types";

export interface NumberWidgetProps extends FieldBasicProps {

  type: 'number';

  style?: 'slider' | 'default';

  min?: number;

  max?: number;
}

export function NumberWidget(props: NumberWidgetProps) {
  return <NumberField name={props.name} defaultValue={props.defaultValue} label={props.label} />
}

NumberWidget.propsToSchema = (props: NumberWidgetProps) => {
  return {
    type: Types.number,
    min: props.min,
    max: props.max,
    ...fieldToSchemaGeneric(props),
  }
};


