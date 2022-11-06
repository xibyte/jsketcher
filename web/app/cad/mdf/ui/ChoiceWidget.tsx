import {ComboBoxField} from "cad/craft/wizard/components/form/Fields";
import React from "react";
import {FieldBasicProps, fieldToSchemaGeneric} from "cad/mdf/ui/field";
import {Types} from "cad/craft/schema/types";
import {ComboBoxOption} from "ui/components/controls/ComboBoxControl";
import {RadioButton} from 'ui/components/controls/RadioButtons';

import {RadioButtonsField} from '../../craft/wizard/components/form/Fields';


type ValueDef = [string, string] | string;

export interface ChoiceWidgetProps extends FieldBasicProps {

  type: 'choice';

  style?: 'dropdown' | 'radio';

  values: ValueDef[];

}

export function ChoiceWidget(props: ChoiceWidgetProps) {
  if (!props.style || props.style === 'dropdown') {
    return <ComboBoxField name={props.name} defaultValue={props.defaultValue} label={props.label} includeNonExistent>
      {props.values.map((value: any) => {
        let val, name;
        if (Array.isArray(value)) {
          [val, name] = value;
        } else {
          val = value;
          name = value;
        }
        return <ComboBoxOption value={val} key={val}>{name}</ComboBoxOption>
      })}
    </ComboBoxField>;
  }
  if (props.style === 'radio'){
    return <RadioButtonsField name={props.name} defaultValue={props.defaultValue} label={props.label} includeNonExistent>
      {props.values.map((value: any) => {
        let val, name;
        if (Array.isArray(value)) {
          [val, name] = value;
        } else {
          val = value;
          name = value;
        }
        return <RadioButton value={val} label={name} key={val} />
      })}
    </RadioButtonsField>;
  }
}

ChoiceWidget.propsToSchema = (props: ChoiceWidgetProps) => {
  return {
    type: Types.string,
    enum: props.values.map(value => Array.isArray(value) ? value[0] : value),
    ...fieldToSchemaGeneric(props),
  }
};


