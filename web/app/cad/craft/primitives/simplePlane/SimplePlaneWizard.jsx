import React from 'react';
import {Group} from '../../wizard/components/form/Form';
import {NumberField, RadioButtonsField} from '../../wizard/components/form/Fields';
import EntityList from '../../wizard/components/form/EntityList';
import {RadioButton} from 'ui/components/controls/RadioButtons';


export default function PlaneWizard() {
  return <Group>
    <RadioButtonsField name='orientation'>
      <RadioButton value='XY' />
      <RadioButton value='XZ' />
      <RadioButton value='ZY' />
    </RadioButtonsField>
    <EntityList name='parallelTo' entity='face' />
    <NumberField name='depth' />
  </Group>;
}