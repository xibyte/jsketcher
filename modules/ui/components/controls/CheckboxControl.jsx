import React, {useContext} from 'react';
import {FieldId} from "ui/components/controls/Field";

export default function CheckboxControl(props) {
  let {onChange, value} = props;
  const fieldId = useContext(FieldId);
  return <input id={fieldId}
                type='checkbox'
                checked={value}
                onChange={e => onChange(e.target.checked)}/>

}
