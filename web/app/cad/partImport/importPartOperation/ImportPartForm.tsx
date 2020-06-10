import React from 'react';
import {Group} from "../../craft/wizard/components/form/Form";
import EntityList from "../../craft/wizard/components/form/EntityList";
import {PartRefField} from "../ui/PartRefControl";

export function ImportPartForm() {

  return <Group>
    <PartRefField name='partRef' label='part' openIfEmpty={true}/>
    <EntityList name='datum' entity='datum' />
  </Group>;
}