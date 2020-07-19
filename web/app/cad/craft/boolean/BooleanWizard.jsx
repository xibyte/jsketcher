import React from 'react';
import {Group} from '../wizard/components/form/Form';
import EntityList from '../wizard/components/form/EntityList';
import Entity from '../wizard/components/form/Entity';

export default function BooleanWizard() {
  return <Group>
    <Entity name='operandA' label='operand A' />
    <Entity name='operandB' label='operand B' />
  </Group>;
}