import React from 'react';
import NumberControl from "ui/components/controls/NumberControl";
import {useStreamWithUpdater} from "ui/effects";
import RadioButtons, {RadioButton} from "ui/components/controls/RadioButtons";
import Stack from "ui/components/Stack";
import Label from "ui/components/controls/Label";
import Field from "ui/components/controls/Field";

export function SketcherPropertiesView() {

  const [dimScale, setDimScale] = useStreamWithUpdater(ctx => ctx.viewer.streams.dimScale);
  const [addingMode, setAddingMode] = useStreamWithUpdater(ctx => ctx.viewer.streams.addingRoleMode);

  return <Stack >
    <Field >
      <Label>Adding Mode</Label>
      <RadioButtons value={addingMode||''} onChange={val => setAddingMode(val||null)}>
        <RadioButton value={''} label='sketch' />
        <RadioButton value='construction' />
      </RadioButtons>
    </Field>
    <Field >
      <Label>Dimension Scale</Label>
      <NumberControl min={0.1} baseStep={0.1} round={1} onChange={setDimScale} value={dimScale} />
    </Field>
  </Stack>;
}
