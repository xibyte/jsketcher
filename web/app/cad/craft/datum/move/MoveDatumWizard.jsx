import React from 'react';
import {Group} from '../../wizard/components/form/Form';
import {CheckboxField, NumberField, ReadOnlyValueField} from '../../wizard/components/form/Fields';

export default function MoveDatumWizard() {
  return <Group>
    <ReadOnlyValueField name='datum'/>
    <NumberField name='x' label='X' />
    <NumberField name='y' label='Y' />
    <NumberField name='z' label='Z' />
    <CheckboxField name='copy' />
  </Group>;
}