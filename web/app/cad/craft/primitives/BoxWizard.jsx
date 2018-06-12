import React from 'react';
import {Group} from '../wizard/components/form/Form';
import {NumberField} from '../wizard/components/form/Fields';

export default function BoxWizard() {
  return <Group>
    <NumberField name='width'  defaultValue={500} min={0}/>
    <NumberField name='height' defaultValue={500} min={0}/>
    <NumberField name='depth'  defaultValue={500} min={0}/>
  </Group>;
}