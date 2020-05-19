import React from 'react';
import Label from 'ui/components/controls/Label';
import Field from 'ui/components/controls/Field';
import Stack from 'ui/components/Stack';
import {camelCaseSplitToStr} from 'gems/camelCaseSplit';

export const FormContext = React.createContext({});

export function Group({children}) {
  return <Stack>
    {children}
  </Stack>;
}

export function formField(Control) {
  return function FormPrimitive({label, name, active, setActive, ...props}) {
    return <Field active={active} name={name} onFocus={setActive} onClick={setActive}>
      <Label>{label || camelCaseSplitToStr(name)}</Label>
      <Control {...props} />
    </Field>;
  }
}

export function attachToForm(Control) {
  return function FormField({name, ...props}) {
    return <FormContext.Consumer>
      {
        ctx => {
          const onChange = val => ctx.updateParam(name, val);
          const setActive = val => ctx.setActiveParam(name);
          return <React.Fragment>
            <Control value={ctx.data[name]} 
                     onChange={onChange} 
                     name={name} {...props}
                     setActive={setActive}
                     active={ctx.activeParam === name} />
          </React.Fragment>;
        }
      }
    </FormContext.Consumer>;
  };
}
