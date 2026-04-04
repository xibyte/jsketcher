import {NumberField} from "cad/craft/wizard/components/form/Fields";
import React from "react";
import {FieldBasicProps, fieldToSchemaGeneric} from "cad/mdf/ui/field";
import {Types} from "cad/craft/schema/types";

export interface NumberWidgetProps extends FieldBasicProps {

  type: 'number';

  style?: 'slider' | 'default';

  min?: number;

  max?: number;

  placeholder?: string;
}

export function NumberWidget(props: NumberWidgetProps) {
  return <NumberField name={props.name} defaultValue={props.defaultValue} label={props.label} placeholder={props.placeholder} />
}

NumberWidget.propsToSchema = (props: NumberWidgetProps) => {
  return {
    type: Types.number,
    min: props.min,
    max: props.max,
    ...fieldToSchemaGeneric(props),
  }
};


