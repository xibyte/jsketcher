import React from 'react';
import {Group} from '../wizard/components/form/Form';
import EntityList from '../wizard/components/form/EntityList';

export default function BooleanWizard() {
  return <Group>
    <EntityList name='operandA' label='operand A' entity='shell' selectionIndex={0} />
    <EntityList name='operandB' label='operand B' entity='shell' selectionIndex={1} />
  </Group>;
}