import React from 'react';
import {attachToForm, Group} from '../../wizard/components/form/Form';
import {NumberField} from '../../wizard/components/form/Fields';
import EntityList from '../../wizard/components/form/EntityList';
import {StackSection} from "ui/components/controls/FormSection";
import Button from "ui/components/controls/Button";
import {IoIosRemoveCircleOutline} from "react-icons/io";
import {IoAddCircleOutline} from "react-icons/io5";
import ls from './CreateDatumWizard.less'
import ComboBoxControl, {ComboBoxOption} from "ui/components/controls/ComboBoxControl";
import NumberControl from "ui/components/controls/NumberControl";
import produce from "immer";

export default function CreateDatumWizard() {
  return <Group>
    <NumberField name='x' label='X' />
    <NumberField name='y' label='Y' />
    <NumberField name='z' label='Z' />
    <EntityList name='originatingFace' label='off of' entity='face' />
    <Rotations name='rotations' />
  </Group>;
}

const Rotations = attachToForm(RotationsImpl);

function RotationsImpl({value, onChange}) {

  value = value || [];

  function add() {

    onChange([
      ...value,
      {
        axis: 'X',
        angle: 0
      }
    ]);

  }

  return <StackSection title='rotations' collapsible>

    {value.map((rot, i) => <div className={ls.rot} key={i}>
      <span className={ls.rotControls}>
        <span>axis:</span>
        <ComboBoxControl onChange={axis => {
          onChange(produce(value, value => {
            value[i].axis = axis
          }));
        }} value={rot.axis}>
          <ComboBoxOption value='X'>X</ComboBoxOption>
          <ComboBoxOption value='Y'>Y</ComboBoxOption>
          <ComboBoxOption value='Z'>Z</ComboBoxOption>
        </ComboBoxControl>
        <span>degree:</span>
        <NumberControl width={50} min={0} max={360} cycle onChange={angle => {
          onChange(produce(value, value => {
            value[i].angle = angle
          }));
        }} value={rot.angle} />
      </span>


      <Button onClick={() => onChange(produce(value, value => {
        value.splice(i, 1);
      }))}  compact type='danger'><IoIosRemoveCircleOutline /></Button>
    </div>)}

    <div>
      <Button onClick={add}  compact><IoAddCircleOutline /> add rotation</Button>
    </div>

  </StackSection>

}