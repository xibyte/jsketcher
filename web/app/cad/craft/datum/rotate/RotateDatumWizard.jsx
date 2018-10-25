import React from 'react';
import {Group} from '../../wizard/components/form/Form';
import {NumberField, RadioButtonsField} from '../../wizard/components/form/Fields';
import {RadioButton} from 'ui/components/controls/RadioButtons';

export default function RotateDatumWizard() {
  return <Group>
    <RadioButtonsField name='axis'>
      <RadioButton value='X' />
      <RadioButton value='Y' />
      <RadioButton value='Z' />
    </RadioButtonsField>
    <NumberField name='angle' />
  </Group>;
}