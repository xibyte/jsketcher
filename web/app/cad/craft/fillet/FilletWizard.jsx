import React from 'react';
import MultiEntity from '../wizard/components/form/MultiEntity';
import {NumberField} from '../wizard/components/form/Fields';

export default function FilletWizard() {

  return <MultiEntity entity='edge' name='edges' itemName='edge'>
    <NumberField name='thickness' defaultValue={20}/>
  </MultiEntity>;
}