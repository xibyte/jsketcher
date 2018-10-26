import React from 'react';
import {Group} from '../../wizard/components/form/Form';
import {NumberField, RadioButtonsField} from '../../wizard/components/form/Fields';
import SingleEntity from '../../wizard/components/form/SingleEntity';
import {RadioButton} from 'ui/components/controls/RadioButtons';


export default function PlaneWizard() {
  return <Group>
    <RadioButtonsField name='orientation'>
      <RadioButton value='XY' />
      <RadioButton value='XZ' />
      <RadioButton value='ZY' />
    </RadioButtonsField>
    <SingleEntity name='parallelTo' entity='face' />
    <NumberField name='depth' />
  </Group>;
}