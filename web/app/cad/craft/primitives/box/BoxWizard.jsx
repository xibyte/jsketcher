import React from 'react';
import {Group} from '../../wizard/components/form/Form';
import {NumberField, ReadOnlyValueField} from '../../wizard/components/form/Fields';
import BooleanChoice from '../../wizard/components/form/BooleanChioce';
import EntityList from '../../wizard/components/form/EntityList';

export default function BoxWizard() {
  return <Group>
    <EntityList name='datum' placeholder='origin'/>
    <NumberField name='width' />
    <NumberField name='height' />
    <NumberField name='depth' />
    <BooleanChoice name='boolean' />
  </Group>;
}