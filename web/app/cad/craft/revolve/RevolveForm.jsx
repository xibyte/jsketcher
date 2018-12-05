import React from 'react';
import {CheckboxField, NumberField} from '../wizard/components/form/Fields';
import {Group} from '../wizard/components/form/Form';
import EntityList from '../wizard/components/form/EntityList';

export default function RevolveForm() {

  return <Group>
    <NumberField name='angle' />
    <EntityList name='face' entity='face' />
    <EntityList name='axis' entity='sketchObject' />
    <CheckboxField name='cut' />
  </Group>;
}