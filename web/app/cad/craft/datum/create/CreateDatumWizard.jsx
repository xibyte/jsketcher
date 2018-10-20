import React from 'react';
import {Group} from '../../wizard/components/form/Form';
import {NumberField} from '../../wizard/components/form/Fields';
import SingleEntity from '../../wizard/components/form/SingleEntity';

export default function CreateDatumWizard() {
  return <Group>
    <NumberField name='x' label='X' />
    <NumberField name='y' label='Y' />
    <NumberField name='z' label='Z' />
    <SingleEntity name='face' label='off of' entity='face' />
  </Group>;
}