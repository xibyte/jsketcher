import React, {useContext} from 'react';
import {FieldId} from "ui/components/controls/Field";

export default function Label({children}) {
  const fieldId = useContext(FieldId);
  return <label htmlFor={fieldId}>{children}</label>
}
