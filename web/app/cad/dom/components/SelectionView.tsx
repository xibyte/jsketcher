import React, {useContext} from 'react';
import {useStream, useStreamWithPatcher} from "ui/effects";
import {SELECTABLE_ENTITIES} from "../../scene/entityContextBundle";
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";
import Field from "ui/components/controls/Field";
import {InnerFolder} from "ui/components/Folder";
import Label from "ui/components/controls/Label";
import TextControl from "ui/components/controls/TextControl";
import Stack from "ui/components/Stack";
import {ColorControl} from "ui/components/controls/ColorControl";


export function SelectionView() {

  const selections = [];
  SELECTABLE_ENTITIES.forEach(entity => {
    selections.push(useStream(ctx => ctx.streams.selection[entity]));
  });



  return <div className='selection-view'>

    {SELECTABLE_ENTITIES.map((entity, i) => {

      const selection = selections[i];

      if (selection.length === 0) {
        return null;
      }
      return <React.Fragment key={i}>
        <Stack>
          {selection.map(id => <SelectedModelView key={id} modelId={id} type={entity}/>)}
        </Stack>
      </React.Fragment>
    })}

  </div>
}

interface SelectedModelViewProps {

  modelId,
  type

}

function SelectedModelView(props: SelectedModelViewProps) {

  const ctx = useContext(ReactApplicationContext);
  const model = ctx.cadRegistry.find(props.modelId);
  const [attrs, patchAttrs] = useStreamWithPatcher(ctx => ctx.attributesService.streams.get(props.modelId));

  const DO_NOTHING = ()=>{};
  return <InnerFolder title={props.type + ' ' + model.id} closable titleClass='bg-color-3'>
    <Stack className='bg-color-4'>
      <Field active={false} name='label' onFocus={DO_NOTHING} onClick={DO_NOTHING}>
        <Label>Label</Label>
        <TextControl value={attrs.label||''} onChange={val => patchAttrs(attrs => attrs.label = val)}/>
      </Field>
      <Field active={false} name='label' onFocus={DO_NOTHING} onClick={DO_NOTHING}>
        <Label>Color</Label>
        <ColorControl
          dialogTitle={`Color for ${props.type} ${props.modelId}`}
          value={attrs.color} onChange={val => patchAttrs(attrs => attrs.color = val)}/>
      </Field>
    </Stack>
  </InnerFolder>;


}