import React from 'react';
import {Group} from '../../wizard/components/form/Form';
import {NumberField, ReadOnlyValueField} from '../../wizard/components/form/Fields';
import BooleanChoice from '../../wizard/components/form/BooleanChioce';

export default function SphereWizard() {
  return <Group>
    <ReadOnlyValueField name='datum' placeholder='origin'/>
    <NumberField name='radius' />
    <BooleanChoice name='boolean' />
  </Group>;
}