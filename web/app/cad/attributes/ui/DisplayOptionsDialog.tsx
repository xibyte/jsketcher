import React, {useContext, useEffect} from "react";
import {useStreamWithPatcher, useStreamWithUpdater} from "ui/effects";
import Stack from "ui/components/Stack";
import Field from "ui/components/controls/Field";
import Label from "ui/components/controls/Label";
import {ColorControl} from "ui/components/controls/ColorControl";
import CheckboxControl from "ui/components/controls/CheckboxControl";
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";
import {ModelAttributes} from "cad/attributes/attributesService";
import {GenericWizard} from "ui/components/GenericWizard";
import {View} from "cad/scene/views/view";

export function DisplayOptionsDialogManager() {

  const [editors, update] = useStreamWithUpdater(ctx => ctx.attributesService.displayOptionsEditors$);

  function close(key: string) {
    update(editor => {
      delete editor[key];
      return editor;
    });
  }

  return <React.Fragment>
    {Object.keys(editors).map(key => {
      const request = editors[key];
      return <GenericWizard key={key} title='display options'
                            onCancel={() => close(key)}
                            onOK={() => close(key)}
                            onClose={() => close(key)}
                            documentationLink='men-at-work'
                            left={request.x}
                            top={request.y}>
        <DisplayOptionsView modelIds={request.models} />
      </GenericWizard>
    })}
  </React.Fragment>;
}


export interface DisplayOptionsViewProps {
  modelIds: string[];
}

export function DisplayOptionsView(props: DisplayOptionsViewProps) {

  const ctx = useContext(ReactApplicationContext);
  const streamsAndPatchers: [ModelAttributes, any][] = [];

  useEffect(()=>{
    return () => {
      View.SUPPRESS_HIGHLIGHTS = false;
      ctx.viewer.requestRender();
    }
  }, []);

  for (const modelId of props.modelIds) {
    const streamAndPatcher = useStreamWithPatcher(ctx => ctx.attributesService.streams.get(modelId));
    streamsAndPatchers.push(streamAndPatcher);
  }

  function patchAttrs(mutator) {
    View.SUPPRESS_HIGHLIGHTS = true;
    for (const [model, patch] of streamsAndPatchers) {
      patch(mutator);
    }
  }

  const [[proto]] = streamsAndPatchers;
  const attrs = proto;

  const DO_NOTHING = ()=>{};
  return <Stack className='bg-color-4'>
    <Field active={false} name='label' onFocus={DO_NOTHING} onClick={DO_NOTHING}>
      <Label>Visible</Label>
      <CheckboxControl value={!attrs.hidden} onChange={val => patchAttrs(attrs => attrs.hidden = !val)}/>
    </Field>
    <Field active={false} name='label' onFocus={DO_NOTHING} onClick={DO_NOTHING}>
      <Label>Color</Label>
      <ColorControl
        dialogTitle={`Color for ${props.modelIds.length} object${props.modelIds.length>0?'s':''}`}
        value={attrs.color} onChange={val => patchAttrs(attrs => attrs.color = val)}/>
    </Field>
  </Stack>;
}
