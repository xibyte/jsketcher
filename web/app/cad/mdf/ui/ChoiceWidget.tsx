import {ComboBoxField, NumberField} from "cad/craft/wizard/components/form/Fields";
import React from "react";
import {OperationSchema} from "cad/craft/schema/schema";
import {FieldBasicProps, fieldToSchemaGeneric} from "cad/mdf/ui/field";
import {Types} from "cad/craft/schema/types";
import {ComboBoxOption} from "ui/components/controls/ComboBoxControl";

export interface ChoiceWidgetProps extends FieldBasicProps {

  type: 'choice';

  style?: 'dropdown' | 'radio';

  values: string[];

}

export function ChoiceWidget(props: ChoiceWidgetProps) {
  if (!props.style || props.style === 'dropdown') {
    return <ComboBoxField name={props.name} defaultValue={props.defaultValue} label={props.label} >
      {props.values.map(value => <ComboBoxOption value={value} key={value}>{value}</ComboBoxOption>)}
    </ComboBoxField>
  } else {
    throw 'implement me';
  }
}

ChoiceWidget.propsToSchema = (props: ChoiceWidgetProps) => {
  return {
    type: Types.string,
    enum: props.values,
    ...fieldToSchemaGeneric(props),
  }
};


