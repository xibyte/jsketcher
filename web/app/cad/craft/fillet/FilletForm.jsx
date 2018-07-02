import React from 'react';
import MultiEntity from '../wizard/components/form/MultiEntity';
import {NumberField} from '../wizard/components/form/Fields';
import filletSchema from './schema';

export default function FilletWizard() {
  
  let {defaultValue: {itemField, entity}, schema} = filletSchema.edges;

  return <MultiEntity schema={schema} 
                      entity={entity}
                      itemField={itemField}
                      name='edges'>
    <NumberField name='thickness' />
  </MultiEntity>;
}