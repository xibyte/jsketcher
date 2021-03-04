import React from 'react';
import {Group} from "../../craft/wizard/components/form/Form";
import {FileField} from "../../craft/wizard/components/form/Fields";

export function ImportStepLocalForm() {

  return <Group>
    <FileField name='file' />
  </Group>;
}