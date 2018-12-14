import React from 'react';
import {Group} from '../../wizard/components/form/Form';
import Entity from '../../wizard/components/form/Entity';


export default function PlaneWizard() {
  return <Group>
    <Entity name='datum' placeholder='origin'/>
  </Group>;
}