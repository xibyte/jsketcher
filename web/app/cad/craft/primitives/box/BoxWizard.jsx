import React from 'react';
import {Group} from '../../wizard/components/form/Form';
import {NumberField, ReadOnlyValueField} from '../../wizard/components/form/Fields';

export default function BoxWizard() {
  return <Group>
    <ReadOnlyValueField name='datum' placeholder='origin'/>
    <NumberField name='width' />
    <NumberField name='height' />
    <NumberField name='depth' />
  </Group>;
}