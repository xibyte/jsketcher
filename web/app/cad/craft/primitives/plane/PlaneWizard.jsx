import React from 'react';
import {Group} from '../../wizard/components/form/Form';
import {ReadOnlyValueField} from '../../wizard/components/form/Fields';


export default function PlaneWizard() {
  return <Group>
    <ReadOnlyValueField name='datum'/>
  </Group>;
}