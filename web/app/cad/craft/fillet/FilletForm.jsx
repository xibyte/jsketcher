import React from 'react';
import {NumberField} from '../wizard/components/form/Fields';
import EntityList from '../wizard/components/form/EntityList';
import {Group} from '../wizard/components/form/Form';

export default function FilletWizard() {
  return <Group>
    <EntityList name='edges' entity='edge' />
    <NumberField name='thickness' />
  </Group>;
}