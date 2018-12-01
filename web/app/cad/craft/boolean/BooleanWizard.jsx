import React from 'react';
import {Group} from '../wizard/components/form/Form';
import BooleanChoice from '../wizard/components/form/BooleanChioce';
import SingleEntity from '../wizard/components/form/SingleEntity';

export default function BooleanWizard() {
  return <Group>
    <SingleEntity name='operandA' label='operand A' entity='shell' selectionIndex={0} />
    <SingleEntity name='operandB' label='operand B' entity='shell' selectionIndex={1} />
  </Group>;
}