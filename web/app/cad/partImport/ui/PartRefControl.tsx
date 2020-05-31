import React, {useContext, useEffect} from 'react';
import {attachToForm, formField} from "../../craft/wizard/components/form/Form";
import InputControl from "ui/components/controls/InputControl";
import {AppContext} from "../../dom/components/AppContext";

export function PartRefControl(props) {

  let {onChange, initValue, onFocus, openIfEmpty} = props;
  useEffect(() => {

    if (openIfEmpty && !initValue) {
      openChooser(undefined);
    }

  }, []);

  const ctx = useContext(AppContext);

  const openChooser = e => {

    ctx.partImportService.choosePartRequest$.next({
      centerScreen: true,
      onDone: () => {}
    })
  };

  return <div style={{
    display: 'flex',
  }}>
    <InputControl type='text'
                  defaultValue={initValue}
                  onChange={e => onChange(e.target.value)}
                  onFocus={onFocus}
                  style={{
                    flex: 1
                  }}/>
    <button className='compact' onClick={openChooser}>...</button>
  </div>

}

export const PartRefField = attachToForm(formField(PartRefControl));
