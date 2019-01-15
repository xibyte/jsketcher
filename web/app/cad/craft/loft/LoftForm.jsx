import React from 'react';
import {Group} from '../wizard/components/form/Form';
import Entity from '../wizard/components/form/Entity';
import BooleanChoice from '../wizard/components/form/BooleanChioce';

export default function LoftForm() {

  return <Group>
    <Entity name='sections' entity='loop' />
    <BooleanChoice name='boolean' />
  </Group>;
}