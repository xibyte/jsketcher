import React from 'react';
import {CheckboxField, NumberField} from '../wizard/components/form/Fields';
import {Group} from '../wizard/components/form/Form';
import Entity from '../wizard/components/form/Entity';
import {StackSection} from 'ui/components/controls/FormSection';

export default function (valueLabel) {
  return function PrismForm() {
    return <Group>
      <NumberField name='value' defaultValue={50} label={valueLabel}/>
      <NumberField name='prism' defaultValue={1} min={0} step={0.1} round={1}/>
      <Entity name='face'/>
      <StackSection title='vector'>
        <Entity label='datum axis' name='datumAxisVector' />
        <Entity label='edge' name='edgeVector' />
        <Entity label='sketch segment' name='sketchSegmentVector' />
        <CheckboxField name='flip'/>
      </StackSection>
    </Group>;
  };
}