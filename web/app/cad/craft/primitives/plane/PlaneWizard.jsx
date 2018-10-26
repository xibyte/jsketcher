import React from 'react';
import {Group} from '../../wizard/components/form/Form';
import {NumberField, RadioButtonsField, ReadOnlyValueField} from '../../wizard/components/form/Fields';
import SingleEntity from '../../wizard/components/form/SingleEntity';
import {RadioButton} from 'ui/components/controls/RadioButtons';


export default function PlaneWizard() {
  return <Group>
    <ReadOnlyValueField name='datum'/>
  </Group>;
}