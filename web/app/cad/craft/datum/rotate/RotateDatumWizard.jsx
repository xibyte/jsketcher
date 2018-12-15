import React from 'react';
import {Group} from '../../wizard/components/form/Form';
import {NumberField, RadioButtonsField} from '../../wizard/components/form/Fields';
import {RadioButton} from 'ui/components/controls/RadioButtons';
import Entity from '../../wizard/components/form/Entity';

export default function RotateDatumWizard() {
  return <Group>
    <Entity name='datum' readOnly />
    <RadioButtonsField name='axis'>
      <RadioButton value='X' />
      <RadioButton value='Y' />
      <RadioButton value='Z' />
    </RadioButtonsField>
    <NumberField name='angle' />
  </Group>;
}