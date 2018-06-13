import React from 'react';
import {CheckboxField, NumberField} from '../wizard/components/form/Fields';
import {Group} from '../wizard/components/form/Form';
import SingleEntity from '../wizard/components/form/SingleEntity';

export default function RevolveWizard() {

  return <Group>
    <NumberField name='angle' defaultValue={45} />
    <SingleEntity name='face' entity='face' />
    <SingleEntity name='axis' entity='sketchObject' />
    <CheckboxField name='cut' defaultValue={false} />
  </Group>;
}