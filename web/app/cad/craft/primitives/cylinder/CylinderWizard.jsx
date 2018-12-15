import React from 'react';
import {Group} from '../../wizard/components/form/Form';
import {NumberField} from '../../wizard/components/form/Fields';
import BooleanChoice from '../../wizard/components/form/BooleanChioce';
import Entity from '../../wizard/components/form/Entity';

export default function CylinderWizard() {
  return <Group>
    <Entity name='datum' placeholder='origin'/>
    <NumberField name='radius' />
    <NumberField name='height' />
    <BooleanChoice name='boolean' />
  </Group>;
}