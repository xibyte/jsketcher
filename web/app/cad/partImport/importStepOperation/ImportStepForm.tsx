import React from 'react';
import {Group} from "../../craft/wizard/components/form/Form";
import {TextField} from "../../craft/wizard/components/form/Fields";

export function ImportStepForm() {

  return <Group>
    <TextField name='url' />
  </Group>;
}