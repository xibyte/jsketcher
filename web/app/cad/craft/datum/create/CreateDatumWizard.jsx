import React from 'react';
import {Group} from '../../wizard/components/form/Form';
import {NumberField} from '../../wizard/components/form/Fields';
import EntityList from '../../wizard/components/form/EntityList';

export default function CreateDatumWizard() {
  return <Group>
    <NumberField name='x' label='X' />
    <NumberField name='y' label='Y' />
    <NumberField name='z' label='Z' />
    <EntityList name='originatingFace' label='off of' entity='face' />
  </Group>;
}