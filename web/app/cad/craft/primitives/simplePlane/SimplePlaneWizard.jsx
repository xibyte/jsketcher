import React from 'react';
import {Group} from '../../wizard/components/form/Form';
import {NumberField, RadioButtonsField} from '../../wizard/components/form/Fields';
import {RadioButton} from 'ui/components/controls/RadioButtons';
import Entity from '../../wizard/components/form/Entity';


export default function PlaneWizard() {
  return <Group>
    <RadioButtonsField name='orientation'>
      <RadioButton value='XY' />
      <RadioButton value='XZ' />
      <RadioButton value='ZY' />
    </RadioButtonsField>
    <Entity name='parallelTo' />
    <NumberField name='depth' />
  </Group>;
}