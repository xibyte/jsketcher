import React from 'react';
import {CheckboxField, NumberField} from '../wizard/components/form/Fields';
import {Group} from '../wizard/components/form/Form';
import Entity from '../wizard/components/form/Entity';
import BooleanChoice from '../wizard/components/form/BooleanChioce';

export default function RevolveForm() {

  return <Group>
    <NumberField name='angle' />
    <Entity name='face' entity='face' />
    <Entity name='axis' entity='sketchObject' />
    <BooleanChoice name='boolean' />
  </Group>;
}