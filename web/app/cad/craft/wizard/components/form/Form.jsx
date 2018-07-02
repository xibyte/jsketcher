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
  return function FormPrimitive({label, name, ...props}) {
    return <Field>
      <Label>{label || camelCaseSplitToStr(name)}</Label>
      <Control {...props} />
    </Field>;
  }
}

export function attachToForm(Control) {
  return function FormField({name, label, ...props}) {
    return <FormContext.Consumer>
      {
        ctx => {
          const onChange = val => {
            ctx.data[name] = val;
            ctx.onChange();
          };
          let initValue = ctx.data[name];
          return <React.Fragment>
            <Control initValue={initValue} onChange={onChange} name={name} {...props} />
          </React.Fragment>;
        }
      }
    </FormContext.Consumer>;
  };
}
